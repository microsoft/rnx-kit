import generate from "@babel/generator";
import { ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { transform } from "../src/babelTransformer";
import { setTransformerPluginOptions } from "../src/context";
import { srcTransformSvg, svgCore } from "../src/srcTransformSvg";
import type { TransformerArgs } from "../src/types";
import { createFixtureArgs } from "./helpers";

/**
 * Recursively walk an AST and look for a JSXOpeningElement whose
 * `name.name` matches the supplied identifier.
 */
function findJsxOpening(node: unknown, name: string): boolean {
  if (!node || typeof node !== "object") return false;
  const n = node as Record<string, unknown> & { type?: string };
  if (
    n.type === "JSXOpeningElement" &&
    (n.name as { name?: string } | undefined)?.name === name
  ) {
    return true;
  }
  for (const key of Object.keys(n)) {
    const v = n[key];
    if (Array.isArray(v)) {
      for (const child of v) {
        if (findJsxOpening(child, name)) return true;
      }
    } else if (v && typeof v === "object") {
      if (findJsxOpening(v, name)) return true;
    }
  }
  return false;
}

describe("SVG transformation (sync)", () => {
  beforeEach(() => setTransformerPluginOptions({ handleSvg: true }));

  it("produces a JSX <Svg> component", () => {
    const result = transform(createFixtureArgs("icon.svg")) as {
      ast: unknown;
    };
    ok(result.ast != null);
    ok(findJsxOpening(result.ast, "Svg"), "expected <Svg> in AST");
  });

  it("the output references react-native-svg or compatible primitives", () => {
    const result = transform(createFixtureArgs("icon.svg")) as {
      ast: import("@babel/core").Node;
    };
    const code = generate(result.ast).code;
    ok(/Svg/.test(code));
    ok(/Path/.test(code) || /path/.test(code));
  });
});

describe("SVG transformation (async)", () => {
  beforeEach(() =>
    setTransformerPluginOptions({ handleSvg: true, asyncTransform: true })
  );

  it("returns a Promise that resolves to a non-null AST", async () => {
    const out = transform(createFixtureArgs("icon.svg"));
    ok(
      typeof (out as Promise<unknown>).then === "function",
      "expected Promise"
    );
    const result = (await out) as { ast: unknown };
    ok(result.ast != null);
    ok(findJsxOpening(result.ast, "Svg"));
  });
});

describe("SVG transformation (missing peer)", () => {
  it("throws an actionable error when @svgr/core is unavailable", (t) => {
    t.mock.method(svgCore, "available", () => false);
    setTransformerPluginOptions({ handleSvg: true });
    let threw: unknown = null;
    try {
      srcTransformSvg({
        src: "<svg/>",
        filename: "icon.svg",
        context: { ext: ".svg", srcSyntax: "jsx" },
        options: {},
        config: {},
      } as unknown as TransformerArgs);
    } catch (e) {
      threw = e;
    }
    ok(threw instanceof Error);
    ok(/@svgr\/core/.test((threw as Error).message));
    ok(/handleSvg/.test((threw as Error).message));
  });
});
