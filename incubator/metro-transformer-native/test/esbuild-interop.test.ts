/**
 * In-process interop checks between this transformer and
 * `@rnx-kit/metro-serializer-esbuild`.
 *
 * The serializer sets `process.env.RNX_METRO_SERIALIZER_ESBUILD = "true"`
 * synchronously when its `MetroSerializer` factory runs. Two cooperation
 * points are exercised here:
 *
 *  1. With `experimentalImportSupport: true`, SWC should emit ES modules so
 *     esbuild can do its tree-shake pass downstream.
 *  2. With `handleModules: true` plus the esbuild env var set, the
 *     transformer should warn that tree-shaking will be defeated.
 *
 * The end-to-end "an unused export disappears from the final bundle" check
 * lives in slice 05 (`bench/bundle-esbuild.ts`), where Metro.runBuild is
 * available to drive a full bundle.
 */
import type { BabelFileResult } from "@babel/core";
import generate from "@babel/generator";
import type { BabelTransformerOptions } from "@rnx-kit/tools-babel";
import { ok } from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { transform } from "../src/babelTransformer";
import { setTransformerPluginOptions } from "../src/context";
import { createFixtureArgs } from "./helpers";

const ESBUILD_ENV = "RNX_METRO_SERIALIZER_ESBUILD";

describe("metro-serializer-esbuild interop (in-process)", () => {
  before(() => {
    // Simulate `@rnx-kit/metro-serializer-esbuild`'s side-effect of setting
    // this env var when its `MetroSerializer` factory is constructed.
    process.env[ESBUILD_ENV] = "true";
    setTransformerPluginOptions({});
  });

  after(() => {
    // Remove the simulated serializer env var so it does not leak into other
    // test files when the runner shares a process.
    delete process.env[ESBUILD_ENV];
    delete process.env["RNX_TRANSFORMER_NATIVE_OPTIONS"];
  });

  it("preserves ImportDeclaration / ExportDeclaration nodes under experimentalImportSupport", () => {
    const result = transform(
      createFixtureArgs("esm-only.ts", undefined, {
        experimentalImportSupport: true,
      } as Partial<BabelTransformerOptions>)
    ) as BabelFileResult;
    ok(result.ast != null, "transformer should produce an AST");
    // `@babel/generator`'s CJS default export is a callable object — accept
    // either shape.
    const gen = (generate as unknown as { default?: typeof generate }).default
      ?? generate;
    const { code } = gen(
      result.ast as Parameters<typeof generate>[0]
    );
    ok(
      /^export\s+(const|function)/m.test(code),
      "expected ES exports preserved (got: " + code.slice(0, 200) + ")"
    );
    ok(
      !/Object\.defineProperty\(\s*exports\b/.test(code),
      "expected no CommonJS exports rewrite"
    );
  });

  it("warns when handleModules:true is combined with esbuild serializer", (t) => {
    const swallow = () => undefined;
    const warnSpy = t.mock.method(console, "warn", swallow);
    setTransformerPluginOptions({ handleModules: true });
    ok(
      warnSpy.mock.calls.some((c) =>
        /tree-shaking/i.test(String(c.arguments[0]))
      ),
      "expected a warning about handleModules + esbuild"
    );
  });
});
