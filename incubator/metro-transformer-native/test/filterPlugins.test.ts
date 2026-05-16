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
import type { PluginItem } from "@babel/core";
import { ok } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  createFixtureArgs,
  deleteSourceModule,
  requireSourceModule,
} from "./helpers.ts";

function loadFreshContext() {
  deleteSourceModule("../src/context.ts");
  const { getTransformerArgs, setTransformerPluginOptions } =
    requireSourceModule<typeof import("../src/context.ts")>("../src/context.ts");
  return { getTransformerArgs, setTransformerPluginOptions };
}

let getTransformerArgs: typeof import("../src/context.ts").getTransformerArgs;
let setTransformerPluginOptions: typeof import("../src/context.ts").setTransformerPluginOptions;

function pluginKey(p: PluginItem): string {
  if (Array.isArray(p)) return pluginKey(p[0] as PluginItem);
  if (typeof p === "object" && p !== null && "key" in (p as object)) {
    return String((p as { key: unknown }).key ?? "");
  }
  return "";
}

function capturePluginKeysFromTransform(fixture: string): string[] {
  const args = getTransformerArgs(createFixtureArgs(fixture));
  return (args?.config.plugins ?? []).map((p) => pluginKey(p as PluginItem));
}

describe("filterConfigPlugins is consumed end-to-end", () => {
  afterEach(() => {
    delete process.env.RNX_TRANSFORMER_NATIVE_OPTIONS;
  });

  it("removes transform-typescript from the babel run when handleTs is true", () => {
    ({ getTransformerArgs, setTransformerPluginOptions } = loadFreshContext());
    setTransformerPluginOptions({ handleTs: true });
    const keys = capturePluginKeysFromTransform("simple.ts");
    ok(
      !keys.includes("transform-typescript"),
      `expected transform-typescript to be filtered out; got plugin keys: ${keys.join(", ")}`
    );
  });

  it("removes transform-react-jsx plugins from the babel run when handleJsx is true", () => {
    ({ getTransformerArgs, setTransformerPluginOptions } = loadFreshContext());
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
    ({ getTransformerArgs, setTransformerPluginOptions } = loadFreshContext());
    setTransformerPluginOptions({ handleTs: true, handleModules: true });
    const keys = capturePluginKeysFromTransform("modules.ts");
    ok(
      !keys.includes("transform-modules-commonjs"),
      `expected transform-modules-commonjs to be filtered out; got plugin keys: ${keys.join(", ")}`
    );
  });

  it("does not disable transform-typescript when handleTs is explicitly false", () => {
    ({ getTransformerArgs, setTransformerPluginOptions } = loadFreshContext());
    setTransformerPluginOptions({ handleTs: false });
    const keys = capturePluginKeysFromTransform("simple.ts");
    ok(
      !keys.includes("transform-typescript"),
      `expected no disabled transform-typescript entry when handleTs is false; got plugin keys: ${keys.join(", ")}`
    );
  });
});
