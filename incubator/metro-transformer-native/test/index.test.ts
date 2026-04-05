import type { TransformerConfigT } from "metro-config";
import { equal, ok } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { MetroTransformerEsbuild } from "../src/index";

describe("MetroTransformerEsbuild", () => {
  const envVar = "RNX_TRANSFORMER_ESBUILD_OPTIONS";

  afterEach(() => {
    delete process.env[envVar];
  });

  it("returns a config with babelTransformerPath", () => {
    const config = MetroTransformerEsbuild();
    ok(config.babelTransformerPath != null);
    ok((config.babelTransformerPath as string).includes("babelTransformer"));
  });

  it("sets options in the environment", () => {
    MetroTransformerEsbuild({ handleJs: true, handleJsx: true });
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
    const config = MetroTransformerEsbuild({}, existing);
    equal(config.minifierPath, "some-minifier");
    ok(config.babelTransformerPath != null);
  });

  it("overrides babelTransformerPath from existing config", () => {
    const existing: Partial<TransformerConfigT> = {
      babelTransformerPath: "old-path",
    };
    const config = MetroTransformerEsbuild({}, existing);
    ok(config.babelTransformerPath !== "old-path");
  });

  it("defaults to empty options", () => {
    MetroTransformerEsbuild();
    const envValue = process.env[envVar];
    ok(envValue != null);
    const parsed = JSON.parse(envValue!);
    equal(Object.keys(parsed).length, 0);
  });
});
