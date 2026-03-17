import type { Node as BabelNode, ParseResult } from "@babel/core";
// @ts-expect-error Node 20.12+ supports require(esm)
import { estreeToBabel } from "estree-to-babel";
import type { Node, OxcError, Program, VisitorObject } from "oxc-parser" with {
  "resolution-mode": "import",
};
// @ts-expect-error Node 20.12+ supports require(esm)
import { Visitor, visitorKeys } from "oxc-parser";

type SourceLocation = NonNullable<BabelNode["loc"]>;

export function getLineNumber(
  needle: number,
  haystack: number[]
): [number, number] {
  let left = 0;
  let right = haystack.length;
  let cur = (left + right) >> 1;

  while (left < right) {
    const pos = haystack[cur];
    if (needle === pos) {
      break;
    } else if (needle < pos) {
      right = cur;
    } else {
      left = cur + 1;
    }
    cur = (left + right) >> 1;
  }

  return [cur + 1, cur === 0 ? 0 : haystack[cur - 1] + 1];
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

export function calculateLocation(
  node: Node,
  newlines: number[]
): SourceLocation {
  const start = getLineNumber(node.start, newlines);
  const end = getLineNumber(node.end, newlines);
  return {
    start: { line: start[0], column: node.start - start[1], index: node.start },
    end: { line: end[0], column: node.end - end[1], index: node.end },
    // @ts-expect-error `filename` *is* in fact nullable
    filename: undefined,
    identifierName: node.type === "Identifier" ? node.name : undefined,
  };
}

export function addSourceLocation(node: Node, newlines: number[]): Node {
  const location = calculateLocation(node, newlines);
  // @ts-expect-error https://github.com/oxc-project/oxc/issues/10307
  node.loc = location;
  return node;
}

export function toBabelAST(program: Program, source: string): ParseResult {
  // TODO: We have to mutate the AST to include source location
  // https://github.com/oxc-project/oxc/issues/10307
  const visitor: VisitorObject = {};
  const newlines = getNewlines(source);
  const addLocation = (node: Node) => addSourceLocation(node, newlines);
  for (const key of Object.keys(visitorKeys) as (keyof VisitorObject)[]) {
    visitor[key] = addLocation;
  }

  new Visitor(visitor).visit(program);
  return estreeToBabel(program, source);
}
