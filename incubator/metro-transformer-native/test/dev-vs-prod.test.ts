import * as babel from "@babel/core";
import generate from "@babel/generator";
import { ok } from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { createFixtureArgs } from "./helpers";

/**
 * `getPluginOptions` in src/context.ts is wrapped in `lazyInit`. Each `it`
 * below needs a fresh options snapshot, so we drop the relevant entries from
 * `require.cache` and re-require before reading.
 */
function loadFreshTransformer() {
  const contextPath = require.resolve("../src/context");
  const babelTransformerPath = require.resolve("../src/babelTransformer");
  delete require.cache[contextPath];
  delete require.cache[babelTransformerPath];
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
    ok(/\b_jsxDEV\b/.test(code), `expected _jsxDEV in dev output: ${code.slice(0, 200)}`);
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
    ok(/\b_jsx[s]?\b/.test(code), `expected _jsx/_jsxs in prod output: ${code.slice(0, 200)}`);
    ok(!/\b_jsxDEV\b/.test(code), `expected no _jsxDEV in prod output: ${code.slice(0, 200)}`);
  });
});

describe("React Refresh / HMR plugin", () => {
  function capturePlugins(args: ReturnType<typeof createFixtureArgs>) {
    const { transform } = loadFreshTransformer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const captured: any[] = [];
    const orig = babel.transformFromAstSync;
    mock.method(
      babel,
      "transformFromAstSync",
      (...rest: Parameters<typeof babel.transformFromAstSync>) => {
        captured.push(...(rest[2]?.plugins ?? []));
        return orig.apply(babel, rest);
      }
    );
    try {
      transform(args);
    } finally {
      mock.reset();
    }
    return captured;
  }

  it("includes a react-refresh plugin when hot is true", () => {
    const { setTransformerPluginOptions } = loadFreshTransformer();
    setTransformerPluginOptions({});
    const captured = capturePlugins(
      createFixtureArgs("component.tsx", undefined, { dev: true, hot: true })
    );
    const names = captured.map(pluginName);
    ok(
      names.some((n) => /react-refresh/i.test(n)),
      `expected a react-refresh plugin; saw: ${names.join(", ")}`
    );
  });

  it("does not include a react-refresh plugin when hot is false", () => {
    const { setTransformerPluginOptions } = loadFreshTransformer();
    setTransformerPluginOptions({});
    const captured = capturePlugins(
      createFixtureArgs("component.tsx", undefined, { dev: true, hot: false })
    );
    const names = captured.map(pluginName);
    ok(
      !names.some((n) => /react-refresh/i.test(n)),
      `did not expect a react-refresh plugin; saw: ${names.join(", ")}`
    );
  });
});

function pluginName(p: unknown): string {
  if (Array.isArray(p)) return pluginName(p[0]);
  if (typeof p === "object" && p !== null) {
    const obj = p as Record<string, unknown>;
    return String(obj.key ?? obj.name ?? "");
  }
  return String(p);
}
