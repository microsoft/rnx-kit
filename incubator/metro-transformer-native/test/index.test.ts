import type { TransformerConfigT } from "metro-config";
import { equal, ok } from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, describe, it } from "node:test";
import { requireSourceModule } from "./helpers.ts";

const { MetroTransformerNative } = requireSourceModule<
  typeof import("../src/index.ts")
>("../src/index.ts");
const require = createRequire(import.meta.url);

describe("MetroTransformerNative", () => {
  const envVar = "RNX_TRANSFORMER_NATIVE_OPTIONS";

  afterEach(() => {
    delete process.env[envVar];
  });

  it("returns a config with babelTransformerPath", () => {
    const config = MetroTransformerNative();
    ok(config.babelTransformerPath != null);
    ok((config.babelTransformerPath as string).includes("babelTransformer"));
  });

  it("sets options in the environment", () => {
    MetroTransformerNative({ handleJs: true, handleJsx: true });
    const envValue = process.env[envVar];
    ok(envValue != null);
    const parsed = JSON.parse(envValue!);
    equal(parsed.handleJs, true);
    equal(parsed.handleJsx, true);
  });

  it("preserves existing config properties", () => {
    const existing: Partial<TransformerConfigT> = {
      minifierPath: "some-minifier",
    };
    const config = MetroTransformerNative({}, existing);
    equal(config.minifierPath, "some-minifier");
    ok(config.babelTransformerPath != null);
  });

  it("overrides babelTransformerPath from existing config", () => {
    const existing: Partial<TransformerConfigT> = {
      babelTransformerPath: "old-path",
    };
    const config = MetroTransformerNative({}, existing);
    ok(config.babelTransformerPath !== "old-path");
  });

  it("defaults to empty options", () => {
    MetroTransformerNative();
    const envValue = process.env[envVar];
    ok(envValue != null);
    const parsed = JSON.parse(envValue!);
    equal(Object.keys(parsed).length, 0);
  });

  it("sets up SVG extension alias when handleSvg is enabled", () => {
    MetroTransformerNative({ handleSvg: true });
    const envValue = process.env[envVar];
    ok(envValue != null);
    const parsed = JSON.parse(envValue!);
    equal(parsed.parseExtAliases?.[".svg"], "jsx");
  });

  it("converts boolean dynamicKey to timestamp string", () => {
    MetroTransformerNative({ dynamicKey: true });
    const envValue = process.env[envVar];
    ok(envValue != null);
    const parsed = JSON.parse(envValue!);
    equal(typeof parsed.dynamicKey, "string");
    ok(!isNaN(Date.parse(parsed.dynamicKey)));
  });

  it("exposes transform and getCacheKey when required at babelTransformerPath", () => {
    const config = MetroTransformerNative();
    ok(config.babelTransformerPath != null);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(config.babelTransformerPath as string);
    equal(typeof mod.transform, "function");
    equal(typeof mod.getCacheKey, "function");
  });
});
