import { deepEqual, equal, match, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { makeEsbuildTransformerConfig } from "../src/index.ts";
import { esbuildMinifier } from "../src/esbuildMinifier.ts";

describe("makeEsbuildTransformerConfig", () => {
  it("returns empty config when no options are provided", () => {
    const config = makeEsbuildTransformerConfig();
    deepEqual(config, {});
  });

  it("returns empty config when both features are disabled", () => {
    const config = makeEsbuildTransformerConfig({
      esbuildTransformer: false,
      esbuildMinifier: false,
    });
    deepEqual(config, {});
  });

  it("sets babelTransformerPath when esbuildTransformer is true", () => {
    const config = makeEsbuildTransformerConfig({ esbuildTransformer: true });
    ok(config.babelTransformerPath);
    match(config.babelTransformerPath!, /esbuildTransformer/);
  });

  it("sets minifierPath when esbuildMinifier is true", () => {
    const config = makeEsbuildTransformerConfig({ esbuildMinifier: true });
    ok(config.minifierPath);
    match(config.minifierPath!, /esbuildMinifier/);
  });

  it("sets both paths when both features are enabled", () => {
    const config = makeEsbuildTransformerConfig({
      esbuildTransformer: true,
      esbuildMinifier: true,
    });
    ok(config.babelTransformerPath);
    ok(config.minifierPath);
  });

  it("passes minifier options through minifierConfig", () => {
    const config = makeEsbuildTransformerConfig({
      esbuildMinifier: {
        minify: true,
        minifySyntax: true,
        sourceMap: true,
      },
    });
    ok(config.minifierPath);
    deepEqual(config.minifierConfig, {
      minify: true,
      minifySyntax: true,
      sourceMap: true,
    });
  });

  it("sets getTransformOptions when esbuildTransformer has options", () => {
    const config = makeEsbuildTransformerConfig({
      esbuildTransformer: { target: "es2020" },
    });
    ok(config.babelTransformerPath);
    ok(config.getTransformOptions);
    equal(typeof config.getTransformOptions, "function");
  });
});

describe("esbuildMinifier", () => {
  it("minifies JavaScript code", async () => {
    const input = "const hello = 'world';\nconsole.log(hello);";
    const result = await esbuildMinifier({
      code: input,
      filename: "test.js",
      reserved: [],
      config: {},
    });
    ok(result.code);
    ok(result.code.length < input.length);
  });

  it("preserves source maps when provided", async () => {
    const result = await esbuildMinifier({
      code: "const x = 1 + 2;",
      filename: "test.js",
      reserved: [],
      config: { sourceMap: true },
      map: {
        version: 3,
        sources: ["test.js"],
        mappings: "",
        sourcesContent: ["const x = 1 + 2;"],
      },
    });
    ok(result.map);
    deepEqual(result.map!.sources, ["test.js"]);
  });

  it("disables identifier mangling when reserved names exist", async () => {
    const result = await esbuildMinifier({
      code: "function keepMe(a, b) { return a + b; }\nkeepMe(1, 2);",
      filename: "test.js",
      reserved: ["keepMe"],
      config: { minify: true },
    });
    ok(result.code.includes("keepMe"));
  });

  it("skips minification when all flags are false", async () => {
    const code = "var   x   =   1   +   2 ;";
    const result = await esbuildMinifier({
      code,
      filename: "test.js",
      reserved: [],
      config: {
        minifyWhitespace: false,
        minifyIdentifiers: false,
        minifySyntax: false,
      },
    });
    ok(result.code);
  });
});

describe("esbuildTransformer", () => {
  it("exports transform and getCacheKey", async () => {
    const transformer = await import("../src/esbuildTransformer.ts");
    equal(typeof transformer.transform, "function");
    equal(typeof transformer.getCacheKey, "function");
  });

  it("getCacheKey returns a string containing esbuild-transformer", async () => {
    const transformer = await import("../src/esbuildTransformer.ts");
    const key = transformer.getCacheKey();
    match(key, /esbuild-transformer/);
  });

  it("transforms TypeScript to a Babel-compatible AST", async () => {
    const transformer = await import("../src/esbuildTransformer.ts");
    const result = await transformer.transform({
      filename: "test.tsx",
      src: "const x: number = 1;\nconst el = <div>hello</div>;",
      options: {
        dev: true,
        enableBabelRuntime: false,
        minify: false,
        platform: "ios",
        projectRoot: "/tmp",
        publicPath: "/",
        globalPrefix: "",
      },
      plugins: [],
    });
    ok(result.ast);
    equal(result.ast.type, "File");
    ok(result.ast.program);
    equal(result.ast.program.type, "Program");
  });

  it("transforms plain JavaScript with JSX", async () => {
    const transformer = await import("../src/esbuildTransformer.ts");
    const result = await transformer.transform({
      filename: "test.js",
      src: "const el = <div>hello</div>;",
      options: {
        dev: false,
        enableBabelRuntime: false,
        minify: false,
        platform: "android",
        projectRoot: "/tmp",
        publicPath: "/",
        globalPrefix: "",
      },
      plugins: [],
    });
    ok(result.ast);
    equal(result.ast.type, "File");
  });
});
