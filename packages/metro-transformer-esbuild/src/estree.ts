import type { Node as BabelNode, ParseResult } from "@babel/core";
import type { Node, OxcError, Program, VisitorObject } from "oxc-parser" with {
  "resolution-mode": "import",
};
// @ts-expect-error Node 20.12+ supports require(esm)
import { Visitor, visitorKeys } from "oxc-parser";
import type { MeasureFunction } from "./types";

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
function getColumn(
  offset: number,
  line: number,
  newlines: number[]
): number {
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

export function isFlowError(errors: OxcError[]): boolean {
  return errors.some((e) => e.message === "Flow is not supported");
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

  // preserve raw in extra for Babel compatibility
  if (raw !== undefined) {
    node.extra = node.extra || {};
    node.extra.raw = raw;
  }

  if (value === null) {
    node.type = "NullLiteral";
  } else if (typeof value === "string") {
    node.type = "StringLiteral";
  } else if (typeof value === "number") {
    node.type = "NumericLiteral";
  } else if (typeof value === "boolean") {
    node.type = "BooleanLiteral";
  } else if (node.bigint !== undefined) {
    node.type = "BigIntLiteral";
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

  const isPrivate = key && key.type === "PrivateIdentifier";

  // hoist function properties to the method node
  node.params = value.params;
  node.body = value.body;
  node.generator = value.generator;
  node.async = value.async;
  node.expression = value.expression;
  node.id = value.id ?? null;
  delete node.value;

  if (isPrivate) {
    node.type = "ClassPrivateMethod";
    // convert PrivateIdentifier key to PrivateName
    convertPrivateIdentifierToName(key);
  } else {
    node.type = "ClassMethod";
  }
}

/**
 * Convert ESTree PropertyDefinition to Babel ClassProperty/ClassPrivateProperty.
 */
function convertPropertyDefinition(node: MutableNode): void {
  if (node.decorators && node.decorators.length === 0) delete node.decorators;
  if (node.key && node.key.type === "PrivateIdentifier") {
    node.type = "ClassPrivateProperty";
    convertPrivateIdentifierToName(node.key);
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
        extra: { raw: JSON.stringify(stmt.directive), rawValue: stmt.directive },
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
    node.value && node.value.type === "FunctionExpression" &&
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
  }
}

/**
 * Convert ImportDeclaration to ensure attributes array exists.
 */
function convertImportDeclaration(node: MutableNode): void {
  if (!node.attributes) {
    node.attributes = [];
  }
}

/**
 * Convert ExportDeclaration to ensure attributes array exists.
 */
function convertExportDeclaration(node: MutableNode): void {
  if (!node.attributes) {
    node.attributes = [];
  }
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

  // default handler: add source location + convert comments + strip empty decorators
  const defaultHandler = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    // OXC adds empty decorators arrays to many node types; Babel's class
    // transform interprets their presence as "has decorators" and errors
    if (n.decorators && n.decorators.length === 0) delete n.decorators;
    if (n.comments) convertNodeComments(n);
  };

  for (const key of Object.keys(visitorKeys) as (keyof VisitorObject)[]) {
    visitor[key] = defaultHandler;
  }

  // override specific node types with specialized conversion
  visitor.Literal = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    convertLiteral(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.Property = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    const isMethodLike =
      n.value && n.value.type === "FunctionExpression" &&
      (n.method || n.kind === "get" || n.kind === "set");
    if (isMethodLike) {
      ctx.deferredObjectMethods.push(n);
    } else {
      n.type = "ObjectProperty";
    }
    if (n.comments) convertNodeComments(n);
  };

  visitor.ChainExpression = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    ctx.deferredChainExpressions.push(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.MethodDefinition = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    ctx.deferredMethods.push(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.PropertyDefinition = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    ctx.deferredPropertyDefs.push(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.PrivateIdentifier = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    convertPrivateIdentifierToName(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.ParenthesizedExpression = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    markParenthesized(n);
    ctx.deferredReplacements.push(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.Program = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    extractDirectives(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.BlockStatement = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    extractDirectives(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.ImportDeclaration = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    convertImportDeclaration(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.ExportNamedDeclaration = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    convertExportDeclaration(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.ExportAllDeclaration = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    convertExportDeclaration(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.TSInterfaceHeritage = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    convertTSInterfaceHeritage(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.TSAbstractMethodDefinition = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
    ctx.deferredAbstractMethods.push(n);
    if (n.comments) convertNodeComments(n);
  };

  visitor.JSXText = (node: Node) => {
    const n = node as MutableNode;
    setLocation(n, ctx.newlines);
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
  trace: MeasureFunction
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

  return {
    type: "File",
    program: prog,
    comments,
  } as unknown as ParseResult;
}
