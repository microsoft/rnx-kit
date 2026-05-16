import generator from "@babel/generator";
const generate = generator.default ?? generator;
import { ok } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { NativeTarget } from "../src/types";
import {
  createFixtureArgs,
  deleteSourceModule,
  requireSourceModule,
} from "./helpers.ts";

/**
 * `getPluginOptions` in src/context.ts is wrapped in `lazyInit`, so the first
 * call within a process caches the parsed options object — later
 * `setTransformerPluginOptions` calls update the env var but the cache returns
 * the stale value. To run the matrix below with a fresh options snapshot per
 * `it`, drop the relevant module entries from `require.cache` and re-require
 * the transformer for each test.
 */
function loadFreshTransformer() {
  deleteSourceModule("../src/context.ts");
  deleteSourceModule("../src/babelTransformer.ts");
  // The src transformers capture `swcCore.get()` via optionalModule; those are
  // safe to keep cached. Re-require only context (the lazyInit owner) and the
  // entry point that imports it.
  const { transform } = requireSourceModule<
    typeof import("../src/babelTransformer.ts")
  >("../src/babelTransformer.ts");
  const { setTransformerPluginOptions } = requireSourceModule<
    typeof import("../src/context.ts")
  >("../src/context.ts");
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

  it("es2022: preserves nullish coalescing and optional chaining", () => {
    const result = transformFixture("es2022");
    ok(result.ast != null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = generate(result.ast as any).code;
    ok(/\?\?/.test(code), "expected ?? preserved at es2022");
    ok(/\?\./.test(code), "expected ?. preserved at es2022");
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
