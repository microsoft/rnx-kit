import generator from "@babel/generator";
const generate = generator.default ?? generator;
import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createFixtureArgs,
  deleteSourceModule,
  requireSourceModule,
} from "./helpers.ts";

/**
 * `getPluginOptions` in src/context.ts is wrapped in `lazyInit`. Each `it`
 * below needs a fresh options snapshot, so we drop the relevant entries from
 * `require.cache` and re-require before reading.
 */
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

describe("JSX runtime: dev vs prod", () => {
  it("dev mode produces _jsxDEV calls when handleJsx is true", () => {
    const { transform, setTransformerPluginOptions } = loadFreshTransformer();
    setTransformerPluginOptions({ handleJsx: true });
    const result = transform(
      createFixtureArgs("component.tsx", undefined, { dev: true })
    );
    ok(result.ast != null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = generate(result.ast as any).code;
    ok(/jsxDevRuntime/.test(code), `expected jsx dev runtime in dev output: ${code.slice(0, 200)}`);
  });

  it("production mode produces _jsx / _jsxs (no _jsxDEV)", () => {
    const { transform, setTransformerPluginOptions } = loadFreshTransformer();
    setTransformerPluginOptions({ handleJsx: true });
    const result = transform(
      createFixtureArgs("component.tsx", undefined, { dev: false })
    );
    ok(result.ast != null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = generate(result.ast as any).code;
    ok(/jsxRuntime/.test(code), `expected jsx runtime in prod output: ${code.slice(0, 200)}`);
    ok(!/\b_jsxDEV\b/.test(code), `expected no _jsxDEV in prod output: ${code.slice(0, 200)}`);
  });
});

describe("React Refresh / HMR plugin", () => {
  it("transforms when hot is true", () => {
    const { transform, setTransformerPluginOptions } = loadFreshTransformer();
    setTransformerPluginOptions({});
    const result = transform(
      createFixtureArgs("component.tsx", undefined, { dev: true, hot: true })
    );
    ok(result.ast != null);
  });

  it("transforms when hot is false", () => {
    const { transform, setTransformerPluginOptions } = loadFreshTransformer();
    setTransformerPluginOptions({});
    const result = transform(
      createFixtureArgs("component.tsx", undefined, { dev: true, hot: false })
    );
    ok(result.ast != null);
  });
});
