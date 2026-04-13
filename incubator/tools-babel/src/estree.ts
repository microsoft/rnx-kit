import type { Node as BabelNode, ParseResult } from "@babel/core";
import type { Node, Program, VisitorObject } from "oxc-parser" with {
  "resolution-mode": "import",
};
import { Visitor, visitorKeys } from "oxc-parser";

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

// ── Comment conversion ──────────────────────────────────────────────

function convertComment(comment: MutableNode): void {
  if (comment.type === "Line") {
    comment.type = "CommentLine";
  } else if (comment.type === "Block") {
    comment.type = "CommentBlock";
  }
}

/**
 * Distribute node-attached comments into Babel's leading/trailing/inner format.
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

// ── Imperative conversion functions ─────────────────────────────────
// These handle complex structural transforms that don't fit a table.

function convertLiteral(node: MutableNode): void {
  if (node.type !== "Literal") return;

  const { value, raw } = node;

  if (raw !== undefined) {
    node.extra = node.extra || {};
    node.extra.raw = raw;
    node.extra.rawValue = value;
    delete node.raw;
  }

  if (value === null) {
    node.type = "NullLiteral";
    delete node.extra;
  } else if (typeof value === "string") {
    node.type = "StringLiteral";
  } else if (typeof value === "number") {
    node.type = "NumericLiteral";
  } else if (typeof value === "boolean") {
    node.type = "BooleanLiteral";
    delete node.extra;
  } else if (node.bigint !== undefined) {
    node.type = "BigIntLiteral";
    const bigintStr =
      typeof node.bigint === "string" ? node.bigint : String(node.bigint);
    node.value = bigintStr;
    delete node.bigint;
    if (node.extra) {
      node.extra.rawValue = bigintStr;
    }
  } else if (node.regex) {
    node.type = "RegExpLiteral";
    node.pattern = node.regex.pattern;
    node.flags = node.regex.flags;
    delete node.regex;
    delete node.value;
    if (node.extra) {
      delete node.extra.rawValue;
    }
  }
}

/**
 * Collect chain nodes in bottom-up order, then mark them top-down.
 * Single O(N) pass instead of O(N²) from nested hasOptionalDescendant checks.
 */
function markOptionalChain(root: MutableNode): void {
  if (!root) return;

  const chain: MutableNode[] = [];
  let node: MutableNode | undefined = root;
  let lowestOptional = -1;

  while (node) {
    if (node.type === "MemberExpression" || node.type === "CallExpression") {
      chain.push(node);
      if (node.optional) lowestOptional = chain.length - 1;
      node = node.type === "MemberExpression" ? node.object : node.callee;
    } else {
      break;
    }
  }

  if (lowestOptional < 0) return;

  for (let i = 0; i <= lowestOptional; i++) {
    const n = chain[i];
    if (n.type === "MemberExpression") {
      n.type = "OptionalMemberExpression";
    } else {
      n.type = "OptionalCallExpression";
    }
    if (!n.optional) n.optional = false;
  }
}

function convertChainExpression(node: MutableNode): void {
  const expr = node.expression;
  if (!expr) return;
  markOptionalChain(expr);
  inlineReplaceWithExpression(node);
}

function convertMethodDefinition(node: MutableNode): void {
  const { key, value } = node;
  if (!value) return;

  const keyType = key && key.type;
  const isPrivate =
    keyType === "PrivateIdentifier" || keyType === "PrivateName";

  node.params = value.params;
  node.body = value.body;
  node.generator = value.generator;
  node.async = value.async;
  node.id = value.id ?? null;
  delete node.value;
  delete node.expression;

  if (isPrivate) {
    node.type = "ClassPrivateMethod";
    if (keyType === "PrivateIdentifier") convertPrivateIdentifierToName(key);
    if (node.kind === "get" || node.kind === "set") {
      if (node.computed === undefined) node.computed = false;
    } else {
      delete node.computed;
    }
  } else if (node.body === null) {
    node.type = "TSDeclareMethod";
    if (node.computed === undefined) node.computed = false;
  } else {
    node.type = "ClassMethod";
    if (node.computed === undefined) node.computed = false;
  }
}

function convertPropertyDefinition(node: MutableNode): void {
  const keyType = node.key && node.key.type;
  if (keyType === "PrivateIdentifier" || keyType === "PrivateName") {
    node.type = "ClassPrivateProperty";
    if (keyType === "PrivateIdentifier")
      convertPrivateIdentifierToName(node.key);
    delete node.computed;
  } else {
    node.type = "ClassProperty";
    if (node.computed === undefined) node.computed = false;
  }
}

function convertTSAbstractPropertyDefinition(node: MutableNode): void {
  node.type = "ClassProperty";
  node.abstract = true;
  if (node.computed === undefined) node.computed = false;
}

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

function markParenthesized(node: MutableNode): void {
  const expr = node.expression;
  if (!expr) return;
  expr.extra = expr.extra || {};
  expr.extra.parenthesized = true;
  expr.extra.parenStart = node.start;
}

function inlineReplaceWithExpression(node: MutableNode): void {
  const expr = node.expression;
  if (!expr) return;
  // Check if the inner node has its own `expression` field (e.g. TSAsExpression,
  // TSSatisfiesExpression). If so, we must NOT delete it after copying.
  const innerHasExpression = "expression" in expr;
  for (const key in expr) {
    node[key] = expr[key];
  }
  if (!innerHasExpression) {
    delete node.expression;
  }
}

function extractDirectives(node: MutableNode): void {
  if (node.directives) return;

  node.directives = [];
  const body = node.body;
  if (!Array.isArray(body)) return;

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
          expressionValue: stmt.directive,
        },
      },
    });
    i++;
  }

  if (i > 0) {
    node.body = body.slice(i);
  }
}

function convertProperty(node: MutableNode): void {
  const isObjectMethod =
    node.value &&
    node.value.type === "FunctionExpression" &&
    (node.method || node.kind === "get" || node.kind === "set");

  if (isObjectMethod) {
    const value = node.value;
    node.type = "ObjectMethod";
    if (node.method || node.kind === "init") {
      node.kind = "method";
    }
    node.params = value.params;
    node.body = value.body;
    node.generator = value.generator;
    node.async = value.async;
    node.id = null;
    delete node.value;
    delete node.shorthand;
  } else {
    node.type = "ObjectProperty";
    if (node.kind === "init") delete node.kind;
    if (node.shorthand) {
      node.extra = node.extra || {};
      node.extra.shorthand = true;
    }
  }
}

function normalizeSpecifierImportKind(node: MutableNode): void {
  if (ctx.isTypeScript) {
    if (!node.importKind) node.importKind = "value";
  } else {
    if (node.importKind === "value") delete node.importKind;
  }
}

function convertImportDeclaration(node: MutableNode): void {
  if (!node.attributes) node.attributes = [];
  if (!node.importKind) node.importKind = "value";
  // Babel omits importKind on bare side-effect imports (no specifiers) for JS files
  if (
    !ctx.isTypeScript &&
    node.importKind === "value" &&
    (!node.specifiers || node.specifiers.length === 0)
  ) {
    delete node.importKind;
  }
}

function convertExportDeclaration(node: MutableNode): void {
  if (!node.attributes) node.attributes = [];
  if (!node.exportKind) node.exportKind = "value";
}

function convertExportAllWithExported(node: MutableNode): void {
  if (!node.exported) return;

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

function convertImportExpression(node: MutableNode): void {
  const args = [node.source];
  if (node.options) args.push(node.options);

  node.type = "CallExpression";
  node.callee = {
    type: "Import",
    start: node.start,
    end: node.start + 6,
    loc: node.loc
      ? {
          start: node.loc.start,
          end: {
            line: node.loc.start.line,
            column: node.loc.start.column + 6,
            index: node.start + 6,
          },
        }
      : undefined,
  };
  node.arguments = args;
  delete node.source;
  delete node.options;
  delete node.phase;
}

function convertEnumDeclaration(node: MutableNode): void {
  if (node.body && node.body.members && !node.members) {
    node.members = node.body.members;
    delete node.body;
  }
}

// ── Universal cleanup (hot path — runs on every node) ───────────────

/**
 * Strip fields that OXC adds on many node types but Babel omits.
 * Only truly universal checks belong here — type-specific cleanup
 * is handled by the per-node-type ops table below.
 */
function cleanupOxcExtras(n: MutableNode): void {
  if (n.decorators && n.decorators.length === 0) delete n.decorators;
  if (n.optional === false) delete n.optional;
  if (n.typeAnnotation === null) delete n.typeAnnotation;
  // These TS flags appear on many node types (PropertyDefinition, MethodDefinition,
  // ClassDeclaration, FunctionExpression, VariableDeclarator, AccessorProperty, etc.)
  // so they stay global rather than being enumerated per-type in the ops table.
  if (n.declare === false) delete n.declare;
  if (n.definite === false) delete n.definite;
  if (n.override === false) delete n.override;
  if (n.readonly === false) delete n.readonly;
  if (n.abstract === false) delete n.abstract;
}

// ── Per-node-type ops table ─────────────────────────────────────────
//
// Declarative rules applied per node type. This is the single place to
// look up "what transforms apply to node type X?". Complex structural
// transforms use the `custom` callback; simple field operations use the
// other fields.
//
// Consumed once at module load to build visitor handler functions.

type NodeOps = {
  /** Rename the node type */
  type?: string;
  /** Fields to unconditionally delete */
  delete?: string[];
  /** Fields to delete when they are empty arrays */
  deleteIfEmpty?: string[];
  /** Fields to delete when false */
  deleteIfFalse?: string[];
  /** Field renames: [from, to] pairs */
  rename?: [from: string, to: string][];
  /** Default values to set if the field is undefined */
  defaults?: [field: string, value: unknown][];
  /** Key in ctx.deferred — node is collected for post-processing */
  defer?: string;
  /** Imperative handler for logic that doesn't fit the table */
  custom?: (n: MutableNode) => void;
};

function applyOps(n: MutableNode, ops: NodeOps): void {
  if (ops.type) n.type = ops.type;
  if (ops.delete) {
    for (const f of ops.delete) delete n[f];
  }
  if (ops.deleteIfEmpty) {
    for (const f of ops.deleteIfEmpty) {
      if (n[f] && n[f].length === 0) delete n[f];
    }
  }
  if (ops.deleteIfFalse) {
    for (const f of ops.deleteIfFalse) {
      if (n[f] === false) delete n[f];
    }
  }
  if (ops.rename) {
    for (const [from, to] of ops.rename) {
      if (n[from] !== undefined && n[to] === undefined) {
        n[to] = n[from];
        delete n[from];
      }
    }
  }
  if (ops.defaults) {
    for (const [f, v] of ops.defaults) {
      if (n[f] === undefined) n[f] = v;
    }
  }
  if (ops.defer) ctx.deferred[ops.defer].push(n);
  if (ops.custom) ops.custom(n);
}

const tsFunctionTypeRenames: [string, string][] = [
  ["params", "parameters"],
  ["returnType", "typeAnnotation"],
];

// ── The table ───────────────────────────────────────────────────────

const nodeOps: Record<string, NodeOps> = {
  // ── Literals ──
  Literal: { custom: convertLiteral },

  // ── Functions: delete expression, track ranges for top-level await ──
  FunctionDeclaration: {
    delete: ["expression"],
    custom: (n) => ctx.functionRanges.push(n.start, n.end),
  },
  FunctionExpression: {
    delete: ["expression"],
    custom: (n) => ctx.functionRanges.push(n.start, n.end),
  },
  ArrowFunctionExpression: {
    delete: ["expression"],
    custom: (n) => ctx.functionRanges.push(n.start, n.end),
  },
  TSDeclareFunction: { delete: ["expression"] },

  // ── Top-level await detection ──
  AwaitExpression: {
    custom: (n) => {
      if (!ctx.hasTopLevelAwait) {
        ctx.hasTopLevelAwait = !isInsideFunction(n.start, n.end);
      }
    },
  },
  ForOfStatement: {
    custom: (n) => {
      if (!ctx.hasTopLevelAwait && n.await) {
        ctx.hasTopLevelAwait = !isInsideFunction(n.start, n.end);
      }
    },
  },

  // ── Properties ──
  Property: {
    custom: (n) => {
      const isMethodLike =
        n.value &&
        n.value.type === "FunctionExpression" &&
        (n.method || n.kind === "get" || n.kind === "set");
      if (isMethodLike) {
        ctx.deferred.objectMethods.push(n);
      } else {
        n.type = "ObjectProperty";
        if (n.kind === "init") delete n.kind;
        if (n.shorthand) {
          n.extra = n.extra || {};
          n.extra.shorthand = true;
        }
      }
    },
  },

  // ── Import/Export specifiers ──
  ImportSpecifier: { custom: normalizeSpecifierImportKind },
  ImportDefaultSpecifier: { custom: normalizeSpecifierImportKind },
  ImportNamespaceSpecifier: { custom: normalizeSpecifierImportKind },
  ExportSpecifier: {
    custom: (n) => {
      if (n.importKind === "value") delete n.importKind;
      const exported = n.exported;
      if (exported && exported.raw !== undefined) {
        // raw hasn't been moved to extra yet (Literal → StringLiteral conversion is deferred)
        if (exported.type === "Literal" || exported.type === "StringLiteral") {
          delete exported.raw;
        }
      }
    },
  },

  // ── Import/Export declarations ──
  ImportDeclaration: { custom: convertImportDeclaration },
  ExportNamedDeclaration: { custom: convertExportDeclaration },
  ExportDefaultDeclaration: { deleteIfEmpty: ["attributes"] },
  ExportAllDeclaration: {
    custom: (n) => {
      convertExportDeclaration(n);
      convertExportAllWithExported(n);
    },
  },

  // ── Deferred nodes (need children visited first) ──
  ImportExpression: { defer: "importExpressions" },
  ChainExpression: { defer: "chainExpressions" },
  MethodDefinition: { defer: "methods" },
  PropertyDefinition: { defer: "propertyDefs" },
  ParenthesizedExpression: { defer: "replacements", custom: markParenthesized },
  PrivateIdentifier: { custom: convertPrivateIdentifierToName },

  // ── Program / Block directives ──
  Program: { custom: extractDirectives },
  BlockStatement: { custom: extractDirectives },

  // ── Classes ──
  ClassDeclaration: { deleteIfEmpty: ["implements"] },
  ClassExpression: { deleteIfEmpty: ["implements"] },

  // ── JSX ──
  JSXOpeningFragment: { delete: ["attributes", "selfClosing"] },
  JSXText: {
    custom: (n) => {
      if (n.raw !== undefined) {
        n.extra = n.extra || {};
        n.extra.raw = n.raw;
        n.extra.rawValue = n.raw;
        delete n.raw;
      }
    },
  },

  // ── TypeScript: type renames ──
  TSClassImplements: { type: "TSExpressionWithTypeArguments" },
  TSInterfaceHeritage: {
    type: "TSExpressionWithTypeArguments",
    custom: convertTSInterfaceHeritage,
  },

  // ── TypeScript: interface / type members ──
  TSPropertySignature: { deleteIfFalse: ["static"] },
  TSIndexSignature: { deleteIfFalse: ["static"] },
  TSInterfaceDeclaration: { deleteIfEmpty: ["extends"] },

  // ── TypeScript: function-like types (params→parameters, returnType→typeAnnotation) ──
  TSFunctionType: { rename: tsFunctionTypeRenames },
  TSConstructorType: { rename: tsFunctionTypeRenames },
  TSCallSignatureDeclaration: { rename: tsFunctionTypeRenames },
  TSConstructSignatureDeclaration: { rename: tsFunctionTypeRenames },
  TSMethodSignature: { rename: tsFunctionTypeRenames },

  // ── TypeScript: type parameters ──
  TSTypeParameter: {
    deleteIfFalse: ["const", "in", "out"],
    custom: (n) => {
      if (
        n.name &&
        typeof n.name === "object" &&
        n.name.type === "Identifier"
      ) {
        n.name = n.name.name;
      }
    },
  },

  // ── TypeScript: enums ──
  TSEnumMember: { delete: ["computed"] },
  TSEnumDeclaration: { defer: "enumDeclarations", deleteIfFalse: ["const"] },
  TSModuleDeclaration: { deleteIfFalse: ["global"] },

  // ── TypeScript: import equals ──
  TSImportEqualsDeclaration: { defaults: [["isExport", false]] },

  // ── TypeScript: abstract members (deferred) ──
  TSAbstractMethodDefinition: { defer: "abstractMethods" },
  TSAbstractPropertyDefinition: { defer: "abstractPropertyDefs" },
};

// ── Post-processors for deferred nodes ──────────────────────────────
// Order matters: some conversions depend on children being fully visited.

const postProcessors: [key: string, fn: (node: MutableNode) => void][] = [
  ["importExpressions", convertImportExpression],
  ["chainExpressions", convertChainExpression],
  ["replacements", inlineReplaceWithExpression],
  ["methods", convertMethodDefinition],
  ["propertyDefs", convertPropertyDefinition],
  ["objectMethods", convertProperty],
  ["abstractMethods", convertTSAbstractMethodDefinition],
  ["enumDeclarations", convertEnumDeclaration],
  ["abstractPropertyDefs", convertTSAbstractPropertyDefinition],
];

// Collect all deferred keys from the table + postProcessors
const deferredKeys = postProcessors.map(([key]) => key);

// ── Conversion context ──────────────────────────────────────────────

type ConvertContext = {
  newlines: number[];
  hasTopLevelAwait: boolean;
  isTypeScript: boolean;
  /** Flat array of [start, end, start, end, ...] for all function nodes */
  functionRanges: number[];
  deferred: Record<string, MutableNode[]>;
};

const ctx: ConvertContext = {
  newlines: [],
  hasTopLevelAwait: false,
  isTypeScript: false,
  functionRanges: [],
  deferred: Object.fromEntries(deferredKeys.map((k) => [k, []])),
};

function resetContext(newlines: number[], isTypeScript: boolean): void {
  ctx.newlines = newlines;
  ctx.hasTopLevelAwait = false;
  ctx.isTypeScript = isTypeScript;
  ctx.functionRanges.length = 0;
  for (const list of Object.values(ctx.deferred)) list.length = 0;
}

/**
 * Check if a node range is contained within any recorded function range.
 */
function isInsideFunction(start: number, end: number): boolean {
  const ranges = ctx.functionRanges;
  for (let i = 0; i < ranges.length; i += 2) {
    if (start >= ranges[i] && end <= ranges[i + 1]) {
      return true;
    }
  }
  return false;
}

// ── Visitor (built once at module load) ─────────────────────────────

function buildVisitor(): VisitorObject {
  const visitor: VisitorObject = {};

  const processNode = (n: MutableNode) => {
    setLocation(n, ctx.newlines);
    cleanupOxcExtras(n);
  };

  // Default handler: location + cleanup + comments
  const defaultHandler = (node: Node) => {
    const n = node as MutableNode;
    processNode(n);
    if (n.comments) convertNodeComments(n);
  };

  for (const key of Object.keys(visitorKeys) as (keyof VisitorObject)[]) {
    visitor[key] = defaultHandler;
  }

  // Generate specialized handlers from the ops table
  for (const [nodeType, ops] of Object.entries(nodeOps)) {
    visitor[nodeType as keyof VisitorObject] = (node: Node) => {
      const n = node as MutableNode;
      processNode(n);
      applyOps(n, ops);
      if (n.comments) convertNodeComments(n);
    };
  }

  return visitor;
}

const moduleVisitor = buildVisitor();

// ── Post-visitor: rename typeArguments → typeParameters ──────────────
// Done after the visitor pass because the visitor uses visitorKeys which
// reference "typeArguments" — renaming during traversal breaks child visiting.

/**
 * Post-visitor tree walk that handles two tasks in a single pass:
 * 1. Rename typeArguments → typeParameters, superTypeArguments → superTypeParameters
 * 2. Fix comment attachment around function params/args using source text
 */
function postVisitorWalk(node: MutableNode, source: string | undefined): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) postVisitorWalk(child, source);
    return;
  }
  if (node.typeArguments && !node.typeParameters) {
    node.typeParameters = node.typeArguments;
    delete node.typeArguments;
  }
  if (node.superTypeArguments) {
    node.superTypeParameters = node.superTypeArguments;
    delete node.superTypeArguments;
  }
  for (const key of Object.keys(node)) {
    const val = node[key];
    if (val && typeof val === "object" && key !== "loc") {
      postVisitorWalk(val, source);
    }
  }
  if (source) {
    fixupFunctionCommentsSingle(node, source);
    fixupParenthesizedLeading(node);
  }
}

// ── Comment attachment ──────────────────────────────────────────────
// OXC returns comments as a flat array on the parse result, not attached
// to individual nodes. Babel's generator requires node-attached comments
// (leadingComments, trailingComments, innerComments). This section
// distributes comments to nodes based on source positions.

type RawComment = {
  type: string;
  value: string;
  start: number;
  end: number;
};

// Fields to skip when collecting children for comment attachment
const COMMENT_SKIP_KEYS = new Set([
  "loc",
  "type",
  "start",
  "end",
  "leadingComments",
  "trailingComments",
  "innerComments",
  "extra",
  "directives",
]);

function isAstNode(val: unknown): val is MutableNode {
  return (
    val !== null &&
    typeof val === "object" &&
    typeof (val as MutableNode).start === "number" &&
    typeof (val as MutableNode).end === "number" &&
    typeof (val as MutableNode).type === "string"
  );
}

/**
 * Find the lower bound index: first comment with start >= pos.
 */
function commentLowerBound(comments: MutableNode[], pos: number): number {
  let lo = 0;
  let hi = comments.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (comments[mid].start < pos) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Attach comments to AST nodes based on source positions.
 *
 * Walks the tree field-by-field. For array fields (params, arguments, body,
 * elements, etc.), comments between elements are attached as:
 *   - **body** arrays (statement lists): trailing on prev AND leading on next
 *   - **all other** arrays: ONLY leading on next
 *   - empty arrays: inner on the parent node
 *
 * Comments between different fields follow statement-body rules (both).
 * Comments inside a leaf node with no children are inner.
 *
 * Returns the full converted comments array for File.comments.
 */
function attachComments(
  root: MutableNode,
  rawComments: RawComment[],
  newlines: number[]
): MutableNode[] {
  if (!rawComments || rawComments.length === 0) return [];

  // Convert raw OXC comments to Babel format with locations
  const comments: MutableNode[] = rawComments.map((c) => {
    const startLine = getLine(c.start, newlines);
    const endLine = getLine(c.end, newlines);
    return {
      type: c.type === "Line" ? "CommentLine" : "CommentBlock",
      value: c.value,
      start: c.start,
      end: c.end,
      loc: {
        start: {
          line: startLine,
          column: getColumn(c.start, startLine, newlines),
          index: c.start,
        },
        end: {
          line: endLine,
          column: getColumn(c.end, endLine, newlines),
          index: c.end,
        },
      } as SourceLocation,
    };
  });

  // Set of comment indices already attached — avoids double-attaching
  const attached = new Set<number>();

  /**
   * Claim unattached comments in [rangeStart, rangeEnd) and push to target array.
   * Returns the index past the last comment checked.
   */
  function claim(
    ci: number,
    rangeEnd: number,
    target: MutableNode,
    kind: "leadingComments" | "trailingComments" | "innerComments"
  ): number {
    while (ci < comments.length && comments[ci].end <= rangeEnd) {
      if (!attached.has(ci)) {
        (target[kind] ??= []).push(comments[ci]);
        attached.add(ci);
      }
      ci++;
    }
    return ci;
  }

  /**
   * Like claim, but also attaches as trailing on `prev` (for body-style gaps).
   */
  function claimBoth(
    ci: number,
    rangeEnd: number,
    prev: MutableNode,
    next: MutableNode
  ): number {
    while (ci < comments.length && comments[ci].end <= rangeEnd) {
      if (!attached.has(ci)) {
        (prev.trailingComments ??= []).push(comments[ci]);
        (next.leadingComments ??= []).push(comments[ci]);
        attached.add(ci);
      }
      ci++;
    }
    return ci;
  }

  /**
   * Process an array of AST nodes (e.g. params, arguments, body).
   * For `body` arrays, comments between elements get both trailing+leading.
   * For other arrays, only leading on the next element.
   * Empty arrays → inner on parent.
   */
  function processArray(
    parent: MutableNode,
    arr: MutableNode[],
    fieldName: string,
    ciStart: number,
    regionEnd: number
  ): number {
    let ci = ciStart;
    const isBody = fieldName === "body";

    if (arr.length === 0) {
      // Empty array — comments in this region are inner on parent
      ci = claim(ci, regionEnd, parent, "innerComments");
      return ci;
    }

    // Before first element
    ci = claim(ci, arr[0].start, arr[0], "leadingComments");

    // Process each element
    for (let i = 0; i < arr.length; i++) {
      visit(arr[i]);
      // Advance past comments inside this element
      while (ci < comments.length && comments[ci].start < arr[i].end) ci++;

      if (i < arr.length - 1) {
        // Gap between arr[i] and arr[i+1]
        if (isBody) {
          ci = claimBoth(ci, arr[i + 1].start, arr[i], arr[i + 1]);
        } else {
          ci = claim(ci, arr[i + 1].start, arr[i + 1], "leadingComments");
        }
      }
    }

    // After last element
    const last = arr[arr.length - 1];
    ci = claim(ci, regionEnd, last, "trailingComments");

    return ci;
  }

  /**
   * Recursively visit a node and attach comments to it and its descendants.
   */
  function visit(node: MutableNode): void {
    // Find comment range for this node
    let ci = commentLowerBound(comments, node.start);
    const hi = commentLowerBound(comments, node.end);
    if (ci >= hi) return; // no comments in this node's range

    // Collect child fields in source order: [fieldName, value, startPos]
    const fields: [string, MutableNode | MutableNode[], number][] = [];
    for (const key of Object.keys(node)) {
      if (COMMENT_SKIP_KEYS.has(key)) continue;
      const val = node[key];
      if (!val || typeof val !== "object") continue;
      if (Array.isArray(val)) {
        const astItems = val.filter(isAstNode);
        if (
          astItems.length > 0 ||
          val === node.params ||
          val === node.arguments ||
          val === node.elements ||
          val === node.properties ||
          val === node.body
        ) {
          const pos = astItems.length > 0 ? astItems[0].start : node.start;
          fields.push([key, astItems, pos]);
        }
      } else if (isAstNode(val)) {
        fields.push([key, val, val.start]);
      }
    }
    fields.sort((a, b) => a[2] - b[2]);

    if (fields.length === 0) {
      // Leaf node — all comments are inner
      claim(ci, node.end, node, "innerComments");
      return;
    }

    // Process gaps between fields and recurse into each field
    for (let fi = 0; fi < fields.length; fi++) {
      const [fieldName, value] = fields[fi];
      const regionEnd =
        fi < fields.length - 1 ? (fields[fi + 1][2] as number) : node.end;

      if (Array.isArray(value)) {
        ci = processArray(
          node,
          value as MutableNode[],
          fieldName,
          ci,
          regionEnd
        );
      } else {
        const child = value as MutableNode;
        // Gap before this child
        ci = claim(ci, child.start, child, "leadingComments");
        visit(child);
        // Advance past comments inside this child
        while (ci < comments.length && comments[ci].start < child.end) ci++;
      }

      // Gap between this field and the next (or end of node)
      if (fi < fields.length - 1) {
        const nextField = fields[fi + 1];
        const nextStart = nextField[2] as number;

        // Get last node of current field and first of next
        let lastOfCurrent: MutableNode | undefined;
        let firstOfNext: MutableNode | undefined;

        if (Array.isArray(value)) {
          const arr = value as MutableNode[];
          if (arr.length > 0) lastOfCurrent = arr[arr.length - 1];
        } else {
          lastOfCurrent = value as MutableNode;
        }

        const nextVal = nextField[1];
        if (Array.isArray(nextVal)) {
          const arr = nextVal as MutableNode[];
          if (arr.length > 0) firstOfNext = arr[0];
        } else {
          firstOfNext = nextVal as MutableNode;
        }

        if (lastOfCurrent) {
          // Between two different fields: trailing on previous only
          ci = claim(ci, nextStart, lastOfCurrent, "trailingComments");
        } else if (firstOfNext) {
          ci = claim(ci, nextStart, firstOfNext, "leadingComments");
        } else {
          // Both sides are empty arrays — inner on parent
          ci = claim(ci, nextStart, node, "innerComments");
        }
      }
    }

    // Remaining unclaimed comments after the last field:
    // - If there's a last positioned child, trailing on it
    // - Otherwise, inner on the node
    if (ci < hi) {
      // Find the last positioned child across all fields
      let lastChild: MutableNode | undefined;
      for (let fi = fields.length - 1; fi >= 0 && !lastChild; fi--) {
        const val = fields[fi][1];
        if (Array.isArray(val)) {
          const arr = val as MutableNode[];
          if (arr.length > 0) lastChild = arr[arr.length - 1];
        } else {
          lastChild = val as MutableNode;
        }
      }

      while (ci < hi) {
        if (!attached.has(ci)) {
          if (lastChild) {
            (lastChild.trailingComments ??= []).push(comments[ci]);
          } else {
            (node.innerComments ??= []).push(comments[ci]);
          }
          attached.add(ci);
        }
        ci++;
      }
    }
  }

  visit(root);
  return comments;
}

/**
 * For nodes with extra.parenthesized, reclaim comments from the previous
 * sibling's trailing that fall inside the paren range (between parenStart
 * and the node's actual start).
 *
 * This fixes cases like: a || (COMMENT b || c) where the comment
 * between ( and b gets attached as trailing on a instead of leading
 * on the parenthesized expression.
 */
function fixupParenthesizedLeading(parent: MutableNode): void {
  // Collect all positioned children sorted by start
  const children: { key: string; node: MutableNode }[] = [];
  for (const key of Object.keys(parent)) {
    if (COMMENT_SKIP_KEYS.has(key)) continue;
    const val = parent[key];
    if (!val || typeof val !== "object") continue;
    if (Array.isArray(val)) {
      for (const item of val) {
        if (isAstNode(item)) children.push({ key, node: item });
      }
    } else if (isAstNode(val)) {
      children.push({ key, node: val });
    }
  }
  children.sort((a, b) => a.node.start - b.node.start);

  // For each parenthesized child, reclaim comments from the preceding child
  for (let i = 1; i < children.length; i++) {
    const right = children[i].node;
    if (!right.extra?.parenthesized) continue;
    const parenStart = right.extra.parenStart;
    if (typeof parenStart !== "number") continue;

    const left = children[i - 1].node;
    // Any comment in the gap between left and the parenthesized right
    // belongs to the right operand (Babel semantics)
    splitComments(
      left,
      "trailingComments",
      right,
      "leadingComments",
      (c) => c.start > left.end
    );
  }
}

type CommentKind = "leadingComments" | "trailingComments" | "innerComments";

/**
 * Split a comment array: comments matching the predicate move to `target[targetKind]`,
 * the rest stay on `owner[sourceKind]`. Deletes the source property if all comments move.
 */
function splitComments(
  owner: MutableNode,
  sourceKind: CommentKind,
  target: MutableNode,
  targetKind: CommentKind,
  predicate: (c: MutableNode) => boolean
): void {
  const comments = owner[sourceKind];
  if (!comments) return;
  const keep: MutableNode[] = [];
  for (const c of comments) {
    if (predicate(c)) {
      (target[targetKind] ??= []).push(c);
    } else {
      keep.push(c);
    }
  }
  if (keep.length > 0) owner[sourceKind] = keep;
  else delete owner[sourceKind];
}

/**
 * Forward-scan source for a character, skipping over `//` and `/* * /` comments.
 * Returns the index of the first match, or -1 if not found.
 */
function findChar(
  source: string,
  target: number,
  start: number,
  end: number
): number {
  for (let i = start; i < end; i++) {
    const ch = source.charCodeAt(i);
    if (ch === target) return i;
    if (ch === 47) {
      // '/' — possible comment start
      const next = source.charCodeAt(i + 1);
      if (next === 42) {
        const close = source.indexOf("*/", i + 2);
        if (close >= 0) i = close + 1;
      } else if (next === 47) {
        const close = source.indexOf("\n", i + 2);
        if (close >= 0) i = close;
      }
    }
  }
  return -1;
}

/**
 * For nodes that start with keywords followed by `(` (switch, catch, while,
 * for, if), move comments from the first child's leadingComments that are
 * between the keyword and `(` into innerComments on the node.
 *
 * Also handles class/object methods where `async`, `static`, `*` keywords
 * precede the key — comments between keywords are inner on the method.
 */
function fixupKeywordToParen(node: MutableNode, source: string): void {
  // Determine the first positioned child field
  let firstChild: MutableNode | undefined;
  const type = node.type;

  if (
    type === "SwitchStatement" ||
    type === "WhileStatement" ||
    type === "DoWhileStatement" ||
    type === "IfStatement"
  ) {
    firstChild = node.discriminant || node.test || node.consequent || undefined;
  } else if (type === "CatchClause") {
    firstChild = node.param || node.body || undefined;
  } else if (type === "ForStatement") {
    firstChild = node.init || node.test || node.update || node.body;
  } else if (type === "ForInStatement" || type === "ForOfStatement") {
    firstChild = node.left || node.right || node.body;
  } else if (
    type === "ClassMethod" ||
    type === "ClassPrivateMethod" ||
    type === "ObjectMethod" ||
    type === "TSDeclareMethod"
  ) {
    firstChild = node.key;
  }

  if (!firstChild || !firstChild.leadingComments) return;

  // Find `(` between node start and first child start
  const openParen = findChar(source, 40, node.start, firstChild.start);

  // For class/object methods: there may be no `(` before the key.
  // Instead, look for `*` (generator marker) to split at.
  if (
    openParen < 0 &&
    (type === "ClassMethod" ||
      type === "ClassPrivateMethod" ||
      type === "ObjectMethod" ||
      type === "TSDeclareMethod")
  ) {
    // Find `*` between node start and key start
    const starPos = findChar(source, 42, node.start, firstChild.start);
    if (starPos >= 0) {
      // Move key.leading comments before `*` to method.inner
      splitComments(
        firstChild,
        "leadingComments",
        node,
        "innerComments",
        (c) => c.end <= starPos
      );
    }
    return;
  }

  if (openParen < 0) return;

  // Move comments before `(` from firstChild.leading to node.inner
  splitComments(
    firstChild,
    "leadingComments",
    node,
    "innerComments",
    (c) => c.end <= openParen
  );
}

/**
 * Fix comment attachment for a single node using source text to find
 * punctuation positions (`(`, `)`, `=>`, `*`) that delimit regions.
 * Called from postVisitorWalk after children are processed.
 *
 * Handles function-like nodes (params), call-like nodes (arguments),
 * and keyword-to-paren nodes (switch, catch, etc.).
 */
function fixupFunctionCommentsSingle(node: MutableNode, source: string): void {
  // Handle switch/catch/while/for: keyword ... (test/discriminant/param)
  // Comments between keyword and `(` should be inner on the node.
  fixupKeywordToParen(node, source);

  // TryStatement: fix `finally` keyword comments — move handler's trailing
  // comments that are before `finally {` to finalizer.leading
  if (node.type === "TryStatement" && node.finalizer && node.handler) {
    const handler = node.handler;
    const finalizer = node.finalizer;
    splitComments(
      handler,
      "trailingComments",
      finalizer,
      "leadingComments",
      (c) => c.end <= finalizer.start && c.start >= handler.end
    );
  }

  // CatchClause: handle param (singular) and body with `)` to `{` gap
  if (node.type === "CatchClause" && node.param && node.body) {
    let closeParen = -1;
    for (let i = node.body.start - 1; i >= node.param.end; i--) {
      if (source.charCodeAt(i) === 41) {
        closeParen = i;
        break;
      }
    }
    if (closeParen >= 0) {
      // Move param's trailing comments after `)` to body.leading
      splitComments(
        node.param,
        "trailingComments",
        node.body,
        "leadingComments",
        (c) => c.start >= closeParen
      );
    }
    return;
  }

  const hasParams = Array.isArray(node.params);
  const hasArgs = Array.isArray(node.arguments);
  if (!hasParams && !hasArgs) return;

  const arr: MutableNode[] = hasParams ? node.params : node.arguments;
  const body = node.body;

  // Find the opening `(` in the source after the id/callee/key
  const searchStart = (node.id || node.key || node.callee)?.end ?? node.start;
  const openParen = findChar(source, 40, searchStart, node.end);
  if (openParen < 0) return;

  // For empty params: comments between searchStart and body.start should
  // be split at openParen: before `(` → trailing on id (if exists) or
  // inner on node; after `(` → inner on node.
  if (arr.length === 0 && body) {
    // Move body-leading comments that are positionally before body into inner
    splitComments(
      body,
      "leadingComments",
      node,
      "innerComments",
      (c) => c.end <= body.start
    );
    // Move id trailing comments that are after openParen into inner
    const id = node.id || node.key;
    if (id) {
      splitComments(
        id,
        "trailingComments",
        node,
        "innerComments",
        (c) => c.start > openParen
      );
    }
    return;
  }

  if (arr.length === 0) {
    // Empty params/args — split inner comments at openParen
    const owner = node.id || node.key || node.callee;
    if (owner) {
      splitComments(
        node,
        "innerComments",
        owner,
        "trailingComments",
        (c) => c.end <= openParen
      );
      splitComments(
        owner,
        "trailingComments",
        node,
        "innerComments",
        (c) => c.start > openParen
      );
    }
    return;
  }

  // Non-empty params: comments between searchStart and first param need
  // to be split at openParen.
  // - Comments before `(`: stay as trailing on id/callee
  // - Comments after `(` but before first param: leading on first param
  const firstParam = arr[0];
  const id = node.id || node.key || node.callee;

  // Split comments at the openParen boundary:
  // - Comments before `(` stay on id as trailing
  // - Comments after `(` should be leading on first param
  // First, remove from firstParam.leading any that are before `(`
  if (firstParam.leadingComments) {
    const keep: MutableNode[] = [];
    for (const c of firstParam.leadingComments) {
      if (c.start <= openParen) {
        if (id) {
          // Before `(` — trailing on id/callee/key
          if (!id.trailingComments || !id.trailingComments.includes(c)) {
            (id.trailingComments ??= []).push(c);
          }
        } else {
          // No owner (e.g. ArrowFunctionExpression) — inner on node
          (node.innerComments ??= []).push(c);
        }
      } else {
        keep.push(c);
      }
    }
    if (keep.length > 0) firstParam.leadingComments = keep;
    else delete firstParam.leadingComments;
  }

  // Move id trailing comments that are after `(` to first param leading
  if (id && id.trailingComments) {
    const keepTrailing: MutableNode[] = [];
    for (const c of id.trailingComments) {
      if (c.start > openParen) {
        if (
          !firstParam.leadingComments ||
          !firstParam.leadingComments.includes(c)
        ) {
          (firstParam.leadingComments ??= []).push(c);
        }
      } else {
        keepTrailing.push(c);
      }
    }
    if (keepTrailing.length > 0) id.trailingComments = keepTrailing;
    else delete id.trailingComments;
  }

  // Fix trailing comma: if there's a `,` between last arg's end and `)`,
  // comments after the comma should be inner on the call/new, not trailing
  // on the last arg.
  if (hasArgs && arr.length > 0 && node.type === "NewExpression") {
    const lastArg = arr[arr.length - 1];
    // Find closing `)` by scanning backwards from node end
    let closeParenCall = -1;
    for (let i = node.end - 1; i >= lastArg.end; i--) {
      if (source.charCodeAt(i) === 41) {
        closeParenCall = i;
        break;
      }
    }
    if (closeParenCall >= 0 && lastArg.trailingComments) {
      // Check for trailing comma between lastArg.end and closeParenCall
      if (findChar(source, 44, lastArg.end, closeParenCall) >= 0) {
        splitComments(
          lastArg,
          "trailingComments",
          node,
          "innerComments",
          (c) => c.end <= closeParenCall
        );
      }
    }
  }

  // Fix comments around `)` and body:
  // - Comments before `)` should be trailing on last param
  // - Comments between `)` and body should be inner on function
  if (body) {
    const lastParam = arr[arr.length - 1];
    let closeParen = -1;
    for (let i = body.start - 1; i >= lastParam.end; i--) {
      if (source.charCodeAt(i) === 41) {
        closeParen = i;
        break;
      }
    }
    if (closeParen >= 0) {
      // Process body.leadingComments first — move those before `)` to last param
      splitComments(
        body,
        "leadingComments",
        lastParam,
        "trailingComments",
        (c) => c.end <= closeParen
      );
      // Then move last param trailing comments after `)` to body.leading
      splitComments(
        lastParam,
        "trailingComments",
        body,
        "leadingComments",
        (c) => c.start >= closeParen
      );

      // For arrow functions: split body.leading at `=>` position.
      // Comments between `)` and `=>` → inner on arrow function.
      // Comments after `=>` → stay as leading on body.
      if (node.type === "ArrowFunctionExpression" && body.leadingComments) {
        let arrowPos = -1;
        for (let i = closeParen + 1; i < body.start - 1; i++) {
          if (source.charCodeAt(i) === 61 && source.charCodeAt(i + 1) === 62) {
            arrowPos = i;
            break;
          }
        }
        if (arrowPos >= 0) {
          splitComments(
            body,
            "leadingComments",
            node,
            "innerComments",
            (c) => c.end <= arrowPos
          );
        }
      }
    }
  }
}

// ── Main conversion entry point ─────────────────────────────────────

/**
 * Convert an OXC ESTree Program to a Babel-compatible AST in a single pass.
 * Uses oxc-parser's built-in Visitor for tree walking (no @babel/traverse overhead)
 * and mutates nodes in-place for zero allocation overhead.
 */
export function toBabelAST(
  program: Program,
  source: string,
  isTypeScript?: boolean,
  rawComments?: RawComment[]
): ParseResult {
  program.start = 0;
  program.end = source.length;

  const newlines = getNewlines(source);
  resetContext(newlines, isTypeScript ?? false);

  // Single-pass visitor
  new Visitor(moduleVisitor).visit(program);

  // Post-process deferred nodes (children are now fully visited)
  for (const [key, fn] of postProcessors) {
    for (const node of ctx.deferred[key]) fn(node);
  }

  // Wrap in Babel's File structure
  const prog = program as MutableNode;
  if (!prog.directives) prog.directives = [];
  delete prog.comments;

  // Attach comments to individual AST nodes and build File.comments
  const comments = rawComments
    ? attachComments(prog, rawComments, newlines)
    : [];

  // Combined post-visitor walk: rename typeArguments + fix function comments
  // Pass source only when there are comments (skip fixup work otherwise)
  postVisitorWalk(prog, comments.length > 0 ? source : undefined);

  prog.extra = { topLevelAwait: ctx.hasTopLevelAwait };

  return {
    type: "File",
    program: prog,
    comments,
    errors: [],
  } as unknown as ParseResult;
}
