import generator from "@babel/generator";
const generate = generator.default ?? generator;
import { ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { TransformerArgs } from "../src/types";
import {
  createFixtureArgs,
  deleteSourceModule,
  requireSourceModule,
} from "./helpers.ts";

function loadFreshTransformer() {
  deleteSourceModule("../src/context.ts");
  deleteSourceModule("../src/babelTransformer.ts");
  const { transform } = requireSourceModule<
    typeof import("../src/babelTransformer.ts")
  >("../src/babelTransformer.ts");
  const { setTransformerPluginOptions } = requireSourceModule<
    typeof import("../src/context.ts")
  >("../src/context.ts");
  return { transform, setTransformerPluginOptions };
}

const { srcTransformSvg, svgCore } = requireSourceModule<
  typeof import("../src/srcTransformSvg.ts")
>("../src/srcTransformSvg.ts");
let transform: typeof import("../src/babelTransformer.ts").transform;
let setTransformerPluginOptions: typeof import("../src/context.ts").setTransformerPluginOptions;

describe("SVG transformation (sync)", () => {
  beforeEach(() => {
    ({ transform, setTransformerPluginOptions } = loadFreshTransformer());
    setTransformerPluginOptions({ handleSvg: true });
  });

  it("produces a non-null AST", () => {
    const result = transform(createFixtureArgs("icon.svg")) as {
      ast: unknown;
    };
    ok(result.ast != null);
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
  beforeEach(() => {
    ({ transform, setTransformerPluginOptions } = loadFreshTransformer());
    setTransformerPluginOptions({ handleSvg: true, asyncTransform: true });
  });

  it("returns a Promise that resolves to a non-null AST", async () => {
    const out = transform(createFixtureArgs("icon.svg"));
    ok(
      typeof (out as Promise<unknown>).then === "function",
      "expected Promise"
    );
    const result = (await out) as { ast: unknown };
    ok(result.ast != null);
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
