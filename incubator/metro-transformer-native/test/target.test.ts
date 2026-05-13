import generate from "@babel/generator";
import { ok } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createFixtureArgs } from "./helpers";
import type { NativeTarget } from "../src/types";

/**
 * `getPluginOptions` in src/context.ts is wrapped in `lazyInit`, so the first
 * call within a process caches the parsed options object — later
 * `setTransformerPluginOptions` calls update the env var but the cache returns
 * the stale value. To run the matrix below with a fresh options snapshot per
 * `it`, drop the relevant module entries from `require.cache` and re-require
 * the transformer for each test.
 */
function loadFreshTransformer() {
  const contextPath = require.resolve("../src/context");
  const babelTransformerPath = require.resolve("../src/babelTransformer");
  delete require.cache[contextPath];
  delete require.cache[babelTransformerPath];
  // The src transformers capture `swcCore.get()` via optionalModule; those are
  // safe to keep cached. Re-require only context (the lazyInit owner) and the
  // entry point that imports it.
  const { transform } = require("../src/babelTransformer") as {
    transform: (
      args: ReturnType<typeof createFixtureArgs>
    ) => import("@babel/core").BabelFileResult;
  };
  const { setTransformerPluginOptions } = require("../src/context") as {
    setTransformerPluginOptions: (options: Record<string, unknown>) => void;
  };
  return { transform, setTransformerPluginOptions };
}

function transformFixture(target: NativeTarget, fixture = "modern-syntax.ts") {
  const { transform, setTransformerPluginOptions } = loadFreshTransformer();
  setTransformerPluginOptions({ target });
  return transform(createFixtureArgs(fixture));
}

describe("target preservation", () => {
  const envVar = "RNX_TRANSFORMER_NATIVE_OPTIONS";
  let savedEnv: string | undefined;

  beforeEach(() => {
    savedEnv = process.env[envVar];
  });

  afterEach(() => {
    if (savedEnv === undefined) {
      delete process.env[envVar];
    } else {
      process.env[envVar] = savedEnv;
    }
  });

  for (const target of ["es2017", "es2020", "es2022"] as const) {
    it(`${target}: produces a non-null AST`, () => {
      const result = transformFixture(target);
      ok(result.ast != null);
    });
  }

  it("es2022: preserves nullish coalescing, optional chaining, private fields", () => {
    const result = transformFixture("es2022");
    ok(result.ast != null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = generate(result.ast as any).code;
    ok(/\?\?/.test(code), "expected ?? preserved at es2022");
    ok(/\?\./.test(code), "expected ?. preserved at es2022");
    ok(/#count/.test(code), "expected #count private field preserved at es2022");
  });

  it("es2017: downlevels ??, ?., and private fields", () => {
    const result = transformFixture("es2017");
    ok(result.ast != null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = generate(result.ast as any).code;
    ok(!/\?\?/.test(code), "expected ?? downleveled at es2017");
    ok(!/#count/.test(code), "expected #count downleveled at es2017");
  });
});
