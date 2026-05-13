/**
 * End-to-end verification for Task 0.4 — `filterConfigPlugins` is consumed by
 * `getTransformerArgs` and the disabled-plugin keys are actually removed from
 * the babel `plugins` array that `transformFromAstSync` ultimately sees.
 *
 * `test/context.test.ts` proves that `configDisabledPlugins` is *populated*.
 * That on its own does not prove the keystone fix: it must also be *applied*.
 * Here we mock `transformFromAstSync`, capture the plugin list it receives,
 * and assert that the keys that should be disabled are not present.
 */
import * as babel from "@babel/core";
import type { PluginItem, TransformOptions } from "@babel/core";
import { ok } from "node:assert/strict";
import { mock } from "node:test";
import { afterEach, describe, it } from "node:test";
import { transform } from "../src/babelTransformer";
import { setTransformerPluginOptions } from "../src/context";
import { createFixtureArgs } from "./helpers";

function pluginKey(p: PluginItem): string {
  if (Array.isArray(p)) return pluginKey(p[0] as PluginItem);
  if (typeof p === "object" && p !== null && "key" in (p as object)) {
    return String((p as { key: unknown }).key ?? "");
  }
  return "";
}

function capturePluginKeysFromTransform(fixture: string): string[] {
  const captured: string[] = [];
  const orig = babel.transformFromAstSync;
  mock.method(
    babel,
    "transformFromAstSync",
    (...args: Parameters<typeof babel.transformFromAstSync>) => {
      const opts = args[2] as TransformOptions | undefined;
      if (opts?.plugins) {
        for (const p of opts.plugins) {
          captured.push(pluginKey(p as PluginItem));
        }
      }
      return orig.apply(babel, args);
    }
  );
  try {
    transform(createFixtureArgs(fixture));
  } finally {
    mock.reset();
  }
  return captured;
}

describe("filterConfigPlugins is consumed end-to-end", () => {
  afterEach(() => {
    delete process.env.RNX_TRANSFORMER_NATIVE_OPTIONS;
    mock.reset();
  });

  it("removes transform-typescript from the babel run when handleTs is true", () => {
    setTransformerPluginOptions({ handleTs: true });
    const keys = capturePluginKeysFromTransform("simple.ts");
    ok(
      !keys.includes("transform-typescript"),
      `expected transform-typescript to be filtered out; got plugin keys: ${keys.join(", ")}`
    );
  });

  it("removes transform-react-jsx plugins from the babel run when handleJsx is true", () => {
    setTransformerPluginOptions({ handleTs: true, handleJsx: true });
    const keys = capturePluginKeysFromTransform("component.tsx");
    ok(
      !keys.includes("transform-react-jsx"),
      `expected transform-react-jsx to be filtered out; got plugin keys: ${keys.join(", ")}`
    );
    ok(
      !keys.includes("transform-react-jsx-source"),
      `expected transform-react-jsx-source to be filtered out; got plugin keys: ${keys.join(", ")}`
    );
    ok(
      !keys.includes("transform-react-jsx-self"),
      `expected transform-react-jsx-self to be filtered out; got plugin keys: ${keys.join(", ")}`
    );
  });

  it("removes transform-modules-commonjs from the babel run when handleModules is true", () => {
    setTransformerPluginOptions({ handleTs: true, handleModules: true });
    const keys = capturePluginKeysFromTransform("modules.ts");
    ok(
      !keys.includes("transform-modules-commonjs"),
      `expected transform-modules-commonjs to be filtered out; got plugin keys: ${keys.join(", ")}`
    );
  });

  it("does not filter typescript transform when handleTs is explicitly false", () => {
    setTransformerPluginOptions({ handleTs: false });
    const keys = capturePluginKeysFromTransform("simple.ts");
    ok(
      keys.includes("transform-typescript"),
      `expected transform-typescript to remain when handleTs is false; got plugin keys: ${keys.join(", ")}`
    );
  });
});
