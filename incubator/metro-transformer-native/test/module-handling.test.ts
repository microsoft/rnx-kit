import type { BabelTransformerOptions } from "@rnx-kit/tools-babel";
/**
 * Tests for the relationship between `handleModules` and Metro's
 * `experimentalImportSupport` option, as routed into the SWC source
 * transformer.
 *
 * The three branches under test:
 *   - experimentalImportSupport:true  → SWC emits ES modules (`module.type === "es6"`)
 *   - handleModules:true              → SWC emits CommonJS
 *   - neither                          → SWC runs syntax-only (no `module` field)
 */
import type * as swcCoreTypes from "@swc/core";
import { equal, ok } from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, describe, it, mock } from "node:test";
import {
  createFixtureArgs,
  deleteSourceModule,
  requireSourceModule,
} from "./helpers.ts";

const require = createRequire(import.meta.url);
const swcCore = require("@swc/core") as typeof swcCoreTypes;

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

let transform: typeof import("../src/babelTransformer.ts").transform;
let setTransformerPluginOptions: typeof import("../src/context.ts").setTransformerPluginOptions;

type CapturedCalls = {
  calls: swcCoreTypes.Options[];
  restore: () => void;
};

function captureSwcOptions(): CapturedCalls {
  const calls: swcCoreTypes.Options[] = [];
  const orig = swcCore.transformSync;
  mock.method(
    swcCore,
    "transformSync",
    (src: string, opts: swcCoreTypes.Options) => {
      calls.push(opts);
      return orig(src, opts);
    }
  );
  return {
    calls,
    restore: () => mock.restoreAll(),
  };
}

describe("handleModules SWC wiring", () => {
  const envVar = "RNX_TRANSFORMER_NATIVE_OPTIONS";

  afterEach(() => {
    delete process.env[envVar];
    mock.restoreAll();
  });

  function resetTransformer() {
    ({ transform, setTransformerPluginOptions } = loadFreshTransformer());
  }

  it("emits module.type === 'commonjs' when handleModules:true and experimentalImportSupport:false", () => {
    resetTransformer();
    setTransformerPluginOptions({ handleModules: true });
    const cap = captureSwcOptions();
    transform(createFixtureArgs("modules.ts"));
    ok(cap.calls.length > 0, "expected at least one SWC call");
    equal(cap.calls[0]?.module?.type, "commonjs");
    cap.restore();
  });

  it("emits module.type === 'es6' when experimentalImportSupport:true", () => {
    resetTransformer();
    setTransformerPluginOptions({});
    const cap = captureSwcOptions();
    transform(
      createFixtureArgs("modules.ts", undefined, {
        experimentalImportSupport: true,
      } as Partial<BabelTransformerOptions>)
    );
    ok(cap.calls.length > 0, "expected at least one SWC call");
    equal(cap.calls[0]?.module?.type, "es6");
    cap.restore();
  });

  it("omits module entirely when neither flag is set", () => {
    resetTransformer();
    setTransformerPluginOptions({});
    const cap = captureSwcOptions();
    transform(createFixtureArgs("modules.ts"));
    ok(cap.calls.length > 0, "expected at least one SWC call");
    ok(
      cap.calls[0]?.module === undefined,
      "expected SWC options to omit the `module` field so Babel handles modules"
    );
    cap.restore();
  });
});
