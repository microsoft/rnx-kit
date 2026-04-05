import type { Node as BabelNode, ParseResult } from "@babel/core";
import type { Node, Program, VisitorObject } from "oxc-parser" with {
  "resolution-mode": "import",
};
import { Visitor, visitorKeys } from "oxc-parser";
import type { TraceFunction } from "./types";

// ── Source location calculation ──────────────────────────────────────

type SourceLocation = NonNullable<BabelNode["loc"]>;

// Loosely typed node for mutation during conversion. We intentionally change
// `type` from ESTree values to Babel values and add/remove arbitrary properties.
// oxlint-disable-next-line typescript/no-explicit-any
type MutableNode = Record<string, any> & {
  loc?: SourceLocation;
  type: string;
  start: number;
  end: number;
};

/**
 * Binary search for the line number containing a byte offset.
 * Returns the 1-based line number.
 */
function getLine(offset: number, newlines: number[]): number {
  let left = 0;
  let right = newlines.length;
  while (left < right) {
    const mid = (left + right) >> 1;
    if (newlines[mid] < offset) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  return left + 1;
}

/**
 * Compute the column for a byte offset given its 1-based line number.
 */
function getColumn(offset: number, line: number, newlines: number[]): number {
  return line <= 1 ? offset : offset - newlines[line - 2] - 1;
}

/**
 * Set the Babel source location directly on a node. Avoids allocating
 * intermediate tuple arrays — line and column are computed inline.
 */
// Minimal loc shape that satisfies Babel without allocating unused fields.
// `filename` and `identifierName` are typed as required by SourceLocation
// but Babel doesn't need them on every node.
type MinimalLoc = {
  start: { line: number; column: number; index: number };
  end: { line: number; column: number; index: number };
  identifierName?: string;
};

function setLocation(node: MutableNode, newlines: number[]): void {
  const startLine = getLine(node.start, newlines);
  const endLine = getLine(node.end, newlines);
  const loc: MinimalLoc = {
    start: {
      line: startLine,
      column: getColumn(node.start, startLine, newlines),
      index: node.start,
    },
    end: {
      line: endLine,
      column: getColumn(node.end, endLine, newlines),
      index: node.end,
    },
  };
  if (node.type === "Identifier") {
    loc.identifierName = node.name;
  }
  node.loc = loc as SourceLocation;
}

export function getNewlines(src: string): number[] {
  const newlines: number[] = [];
  let i = src.indexOf("\n");
  while (i >= 0) {
    newlines.push(i);
    i = src.indexOf("\n", i + 1);
  }
  return newlines;
}

// ── ESTree to Babel conversion (single-pass, no @babel/traverse) ─────

/**
 * Convert comment format from ESTree to Babel. Mutates in place.
 */
function convertComment(comment: MutableNode): void {
  if (comment.type === "Line") {
    comment.type = "CommentLine";
  } else if (comment.type === "Block") {
    comment.type = "CommentBlock";
  }
}

/**
 * Distribute node-attached comments into Babel's leading/trailing/inner format.
 * Runs on every node that has an ESTree `comments` array.
 */
function convertNodeComments(node: MutableNode): void {
  const comments = node.comments;
  if (!comments) return;

  delete node.comments;
  let leading: MutableNode[] | undefined;
  let trailing: MutableNode[] | undefined;
  let inner: MutableNode[] | undefined;

  for (const comment of comments) {
    convertComment(comment);
    if (comment.trailing) {
      (trailing ??= []).push(comment);
    } else if (comment.leading) {
      (leading ??= []).push(comment);
    } else {
      (inner ??= []).push(comment);
    }
    delete comment.leading;
    delete comment.trailing;
  }

  if (leading) node.leadingComments = leading;
  if (trailing) node.trailingComments = trailing;
  if (inner) node.innerComments = inner;
}

/**
 * Convert ESTree Literal node to the appropriate Babel literal type.
 */
function convertLiteral(node: MutableNode): void {
  if (node.type !== "Literal") return;

  const { value, raw } = node;

  // preserve raw in extra for Babel compatibility, then remove from node
  if (raw !== undefined) {
    node.extra = node.extra || {};
    node.extra.raw = raw;
    node.extra.rawValue = value;
    delete node.raw;
  }

  if (value === null) {
    node.type = "NullLiteral";
    delete node.extra; // Babel doesn't include extra on NullLiteral
  } else if (typeof value === "string") {
    node.type = "StringLiteral";
  } else if (typeof value === "number") {
    node.type = "NumericLiteral";
  } else if (typeof value === "boolean") {
    node.type = "BooleanLiteral";
    delete node.extra; // Babel doesn't include extra on BooleanLiteral
  } else if (node.bigint !== undefined) {
    node.type = "BigIntLiteral";
    // Babel stores bigint value as string, delete the numeric value
    delete node.value;
    // ensure bigint is a string
    if (typeof node.bigint !== "string") {
      node.bigint = String(node.bigint);
    }
  } else if (node.regex) {
    node.type = "RegExpLiteral";
    node.pattern = node.regex.pattern;
    node.flags = node.regex.flags;
    delete node.regex;
  }
}

/**
 * Recursively mark MemberExpression/CallExpression nodes within a chain
 * as their Optional* counterparts.
 */
function markOptionalChain(node: MutableNode): void {
  if (!node) return;

  if (node.type === "MemberExpression") {
    node.type = "OptionalMemberExpression";
    markOptionalChain(node.object);
  } else if (node.type === "CallExpression") {
    node.type = "OptionalCallExpression";
    markOptionalChain(node.callee);
  }
}

/**
 * Convert a ChainExpression's children to Babel's Optional* types and
 * inline-replace the wrapper. Must be called AFTER the visitor has finished
 * walking so that child type mutations don't interfere with visitor key lookup.
 */
function convertChainExpression(node: MutableNode): void {
  const expr = node.expression;
  if (!expr) return;

  markOptionalChain(expr);
  inlineReplaceWithExpression(node);
}

/**
 * Convert ESTree MethodDefinition to Babel ClassMethod/ClassPrivateMethod.
 */
function convertMethodDefinition(node: MutableNode): void {
  if (node.decorators && node.decorators.length === 0) delete node.decorators;
  const { key, value } = node;
  if (!value) return;

  const keyType = key && key.type;
  const isPrivate =
    keyType === "PrivateIdentifier" || keyType === "PrivateName";

  // hoist function properties to the method node
  node.params = value.params;
  node.body = value.body;
  node.generator = value.generator;
  node.async = value.async;
  node.id = value.id ?? null;
  delete node.value;
  // Babel doesn't include expression on ClassMethod/ClassPrivateMethod
  delete node.expression;

  if (isPrivate) {
    node.type = "ClassPrivateMethod";
    if (keyType === "PrivateIdentifier") {
      convertPrivateIdentifierToName(key);
    }
    // Babel doesn't include computed on private methods
    delete node.computed;
  } else {
    node.type = "ClassMethod";
  }
}

/**
 * Convert ESTree PropertyDefinition to Babel ClassProperty/ClassPrivateProperty.
 */
function convertPropertyDefinition(node: MutableNode): void {
  if (node.decorators && node.decorators.length === 0) delete node.decorators;
  const keyType = node.key && node.key.type;
  if (keyType === "PrivateIdentifier" || keyType === "PrivateName") {
    node.type = "ClassPrivateProperty";
    if (keyType === "PrivateIdentifier") {
      convertPrivateIdentifierToName(node.key);
    }
    // Babel doesn't include computed on private properties
    delete node.computed;
  } else {
    node.type = "ClassProperty";
  }
}

/**
 * Convert ESTree PrivateIdentifier to Babel PrivateName in place.
 */
function convertPrivateIdentifierToName(node: MutableNode): void {
  const name = node.name;
  const loc = node.loc;
  node.type = "PrivateName";
  node.id = {
    type: "Identifier",
    name,
    loc: loc
      ? {
          start: {
            line: loc.start.line,
            column: loc.start.column + 1,
          },
          end: loc.end,
        }
      : undefined,
  };
  delete node.name;
}

/**
 * Mark the inner expression as parenthesized. The actual node replacement
 * happens in post-processing (see inlineReplaceWithExpression).
 */
function markParenthesized(node: MutableNode): void {
  const expr = node.expression;
  if (!expr) return;

  expr.extra = expr.extra || {};
  expr.extra.parenthesized = true;
  expr.extra.parenStart = node.start;
}

/**
 * Inline-replace a wrapper node (ChainExpression, ParenthesizedExpression)
 * with its expression child by copying all child properties onto the parent.
 * Safe to call after the visitor has finished walking.
 */
function inlineReplaceWithExpression(node: MutableNode): void {
  const expr = node.expression;
  if (!expr) return;

  for (const key in expr) {
    node[key] = expr[key];
  }
  delete node.expression;
}

/**
 * Extract "use strict" and similar directives from the body of a
 * BlockStatement or Program.
 */
function extractDirectives(node: MutableNode): void {
  if (node.directives) return; // already processed

  node.directives = [];
  const body = node.body;
  if (!Array.isArray(body)) return;

  // directives must be leading contiguous ExpressionStatements with a directive property
  let i = 0;
  while (i < body.length) {
    const stmt = body[i];
    if (stmt.type !== "ExpressionStatement" || !stmt.directive) break;

    node.directives.push({
      type: "Directive",
      value: {
        type: "DirectiveLiteral",
        value: stmt.directive,
        extra: {
          raw: JSON.stringify(stmt.directive),
          rawValue: stmt.directive,
        },
      },
    });
    i++;
  }

  // remove directive statements from body
  if (i > 0) {
    node.body = body.slice(i);
  }
}

/**
 * Convert ESTree Property to Babel ObjectProperty, and handle object method
 * shorthand (method: true with FunctionExpression value).
 */
function convertProperty(node: MutableNode): void {
  const isObjectMethod =
    node.value &&
    node.value.type === "FunctionExpression" &&
    (node.method || node.kind === "get" || node.kind === "set");

  if (isObjectMethod) {
    const value = node.value;
    node.type = "ObjectMethod";
    node.kind = node.kind || "method";
    node.params = value.params;
    node.body = value.body;
    node.generator = value.generator;
    node.async = value.async;
    node.id = null;
    delete node.value;
    delete node.method;
  } else {
    node.type = "ObjectProperty";
    // Babel doesn't include kind: "init" on ObjectProperty
    if (node.kind === "init") delete node.kind;
    // Babel sets extra.shorthand for shorthand properties
    if (node.shorthand) {
      node.extra = node.extra || {};
      node.extra.shorthand = true;
    }
  }
}

/**
 * Convert ImportDeclaration to ensure attributes array exists.
 */
function convertImportDeclaration(node: MutableNode): void {
  if (!node.attributes) {
    node.attributes = [];
  }
  if (!node.importKind) {
    node.importKind = "value";
  }
}

/**
 * Convert ExportDeclaration to ensure attributes array exists, and handle
 * `export * as X from` which ESTree represents as ExportAllDeclaration with
 * an `exported` field but Babel represents as ExportNamedDeclaration.
 */
function convertExportDeclaration(node: MutableNode): void {
  if (!node.attributes) {
    node.attributes = [];
  }
  if (!node.exportKind) {
    node.exportKind = "value";
  }
}

/**
 * Convert ExportAllDeclaration with an `exported` field to ExportNamedDeclaration.
 * ESTree: `export * as X from "foo"` → ExportAllDeclaration { exported: Identifier }
 * Babel:  `export * as X from "foo"` → ExportNamedDeclaration { specifiers: [ExportNamespaceSpecifier] }
 */
function convertExportAllWithExported(node: MutableNode): void {
  if (!node.exported) return;

  // convert Literal exported name to StringLiteral for Babel compatibility
  const exported = node.exported;
  if (exported.type === "Literal" && typeof exported.value === "string") {
    exported.type = "StringLiteral";
    if (exported.raw !== undefined) {
      exported.extra = exported.extra || {};
      exported.extra.raw = exported.raw;
      exported.extra.rawValue = exported.value;
    }
  }

  node.type = "ExportNamedDeclaration";
  node.specifiers = [
    {
      type: "ExportNamespaceSpecifier",
      exported,
      loc: exported.loc,
      start: exported.start,
      end: exported.end,
    },
  ];
  node.declaration = null;
  delete node.exported;
}

/**
 * Convert TSInterfaceHeritage MemberExpression chain to TSQualifiedName.
 */
function convertTSInterfaceHeritage(node: MutableNode): void {
  let expr = node.expression;
  while (expr && expr.type === "MemberExpression") {
    expr.type = "TSQualifiedName";
    expr.left = expr.object;
    expr.right = expr.property;
    delete expr.object;
    delete expr.property;
    expr = expr.left;
  }
}

/**
 * Convert TSAbstractMethodDefinition to TSDeclareMethod.
 */
function convertTSAbstractMethodDefinition(node: MutableNode): void {
  const { value } = node;
  if (!value) return;

  node.type = "TSDeclareMethod";
  node.abstract = true;
  node.generator = value.generator;
  node.async = value.async;
  node.params = value.params;
  node.id = value.id;
  node.returnType = value.returnType;
  delete node.value;
}

// ── Common cleanup for OXC nodes ─────────────────────────────────────

/**
 * Strip fields that OXC adds but Babel doesn't include, and normalize values.
 * Called on every node during the visitor pass.
 */
function cleanupOxcExtras(n: MutableNode): void {
  // OXC adds empty decorators arrays; Babel's class transform errors on them
  if (n.decorators && n.decorators.length === 0) delete n.decorators;
  // OXC includes optional: false on non-optional calls/members; Babel omits it
  // But Babel DOES include optional on OptionalCallExpression/OptionalMemberExpression
  if (
    n.optional === false &&
    n.type !== "OptionalCallExpression" &&
    n.type !== "OptionalMemberExpression"
  ) {
    delete n.optional;
  }
  // OXC includes expression on functions; Babel omits it
  if (
    n.type === "FunctionDeclaration" ||
    n.type === "FunctionExpression" ||
    n.type === "ArrowFunctionExpression"
  ) {
    delete n.expression;
  }
  // Note: do NOT delete shorthand: false — Babel includes it on ObjectProperty
  // OXC keeps `raw` directly on numeric/string/bool literals; Babel uses extra.raw only
  if (n.type === "Literal" || n.type === "TemplateLiteral") {
    // handled in convertLiteral, but template elements have raw too
  }
}

// ── Visitor (built once at module load) ──────────────────────────────

/**
 * Mutable conversion context, reset per toBabelAST call. Avoids rebuilding
 * the visitor object and its ~165 handler assignments on every file.
 */
type ConvertContext = {
  newlines: number[];
  deferredChainExpressions: MutableNode[];
  deferredReplacements: MutableNode[];
  deferredMethods: MutableNode[];
  deferredPropertyDefs: MutableNode[];
  deferredObjectMethods: MutableNode[];
  deferredAbstractMethods: MutableNode[];
};

// Singleton context — mutated in place by toBabelAST before each visitor run
const ctx: ConvertContext = {
  newlines: [],
  deferredChainExpressions: [],
  deferredReplacements: [],
  deferredMethods: [],
  deferredPropertyDefs: [],
  deferredObjectMethods: [],
  deferredAbstractMethods: [],
};

function resetContext(newlines: number[]): void {
  ctx.newlines = newlines;
  ctx.deferredChainExpressions.length = 0;
  ctx.deferredReplacements.length = 0;
  ctx.deferredMethods.length = 0;
  ctx.deferredPropertyDefs.length = 0;
  ctx.deferredObjectMethods.length = 0;
  ctx.deferredAbstractMethods.length = 0;
}

/**
 * Build the visitor once at module load. All handlers close over `ctx` which
 * is reset before each toBabelAST call.
 */
function buildVisitor(): VisitorObject {
  const visitor: VisitorObject = {};

  // default handler: add source location + convert comments + strip OXC extras
  const defaultHandler = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    if (n.comments) convertNodeComments(n);
  };

  for (const key of Object.keys(visitorKeys) as (keyof VisitorObject)[]) {
    visitor[key] = defaultHandler;
  }

  // helper: default processing shared by all specialized handlers
  const processNode = (n: MutableNode) => {
    setLocation(n, ctx.newlines);
    cleanupOxcExtras(n);
  };

  // override specific node types with specialized conversion
  visitor.Literal = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    convertLiteral(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.Property = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    const isMethodLike =
      n.value &&
      n.value.type === "FunctionExpression" &&
      (n.method || n.kind === "get" || n.kind === "set");
    if (isMethodLike) {
      ctx.deferredObjectMethods.push(n);
    } else {
      n.type = "ObjectProperty";
      if (n.kind === "init") delete n.kind;
      if (n.shorthand) {
        n.extra = n.extra || {};
        n.extra.shorthand = true;
      }
    }
    if (n.comments) convertNodeComments(n);
  };

  visitor.ChainExpression = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    ctx.deferredChainExpressions.push(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.MethodDefinition = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    ctx.deferredMethods.push(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.PropertyDefinition = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    ctx.deferredPropertyDefs.push(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.PrivateIdentifier = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    convertPrivateIdentifierToName(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.ParenthesizedExpression = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    markParenthesized(n);
    ctx.deferredReplacements.push(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.Program = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    extractDirectives(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.BlockStatement = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    extractDirectives(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.ImportDeclaration = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    convertImportDeclaration(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.ExportNamedDeclaration = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    convertExportDeclaration(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.ExportAllDeclaration = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    convertExportDeclaration(n);
    convertExportAllWithExported(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.TSInterfaceHeritage = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    convertTSInterfaceHeritage(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.TSAbstractMethodDefinition = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    ctx.deferredAbstractMethods.push(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.JSXText = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    if (n.raw !== undefined) {
      n.extra = n.extra || {};
      n.extra.raw = n.raw;
    }
    if (n.comments) convertNodeComments(n);
  };

  return visitor;
}

// Build once at module load
const moduleVisitor = buildVisitor();

// ── Main conversion entry point ──────────────────────────────────────

/**
 * Convert an OXC ESTree Program to a Babel-compatible AST in a single pass.
 * Uses oxc-parser's built-in Visitor for tree walking (no @babel/traverse overhead)
 * and mutates nodes in-place for zero allocation overhead.
 */
export function toBabelAST(
  program: Program,
  source: string,
  trace: TraceFunction
): ParseResult {
  // oxc-parser skips leading/trailing comments; Babel expects program to span the full source
  program.start = 0;
  program.end = source.length;

  // reset the shared context for this conversion
  resetContext(getNewlines(source));

  // run the single-pass visitor (pre-built at module load)
  trace("transform parse oxc visit", () =>
    new Visitor(moduleVisitor).visit(program)
  );

  // post-process deferred nodes now that all children have been visited
  for (const node of ctx.deferredChainExpressions) {
    convertChainExpression(node);
  }
  for (const node of ctx.deferredReplacements) {
    inlineReplaceWithExpression(node);
  }
  for (const node of ctx.deferredMethods) {
    convertMethodDefinition(node);
  }
  for (const node of ctx.deferredPropertyDefs) {
    convertPropertyDefinition(node);
  }
  for (const node of ctx.deferredObjectMethods) {
    convertProperty(node);
  }
  for (const node of ctx.deferredAbstractMethods) {
    convertTSAbstractMethodDefinition(node);
  }

  // wrap in Babel's File structure
  const prog = program as MutableNode;
  if (!prog.directives) prog.directives = [];

  const comments = prog.comments || [];
  for (const c of comments) {
    convertComment(c as MutableNode);
  }
  delete prog.comments;

  // Babel adds extra.topLevelAwait to the program node
  if (!prog.extra) {
    prog.extra = { topLevelAwait: false };
  }

  return {
    type: "File",
    program: prog,
    comments,
    errors: [],
  } as unknown as ParseResult;
}
