import type { BabelTransformerArgs } from "@rnx-kit/tools-babel";
import { deepEqual, equal, ok } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  setTransformerPluginOptions,
  updateTransformerContext,
} from "../src/context";
import type { TransformerContext } from "../src/types";

const envVar = "RNX_TRANSFORMER_NATIVE_OPTIONS";

describe("setTransformerPluginOptions", () => {
  afterEach(() => {
    delete process.env[envVar];
  });

  it("serializes options to the environment variable", () => {
    setTransformerPluginOptions({ handleJs: true });
    const value = process.env[envVar];
    ok(value != null);
    deepEqual(JSON.parse(value!), { handleJs: true });
  });

  it("converts boolean dynamicKey to a timestamp string", () => {
    setTransformerPluginOptions({ dynamicKey: true });
    const parsed = JSON.parse(process.env[envVar]!);
    equal(typeof parsed.dynamicKey, "string");
    ok(!isNaN(Date.parse(parsed.dynamicKey)));
  });

  it("preserves string dynamicKey as-is", () => {
    setTransformerPluginOptions({ dynamicKey: "my-key" });
    const parsed = JSON.parse(process.env[envVar]!);
    equal(parsed.dynamicKey, "my-key");
  });

  it("sets up SVG extension alias when handleSvg is true", () => {
    setTransformerPluginOptions({ handleSvg: true });
    const parsed = JSON.parse(process.env[envVar]!);
    equal(parsed.parseExtAliases?.[".svg"], "jsx");
  });

  it("does not add SVG alias when handleSvg is false", () => {
    setTransformerPluginOptions({ handleSvg: false });
    const parsed = JSON.parse(process.env[envVar]!);
    equal(parsed.parseExtAliases, undefined);
  });
});

describe("updateTransformerContext", () => {
  function makeContext(
    overrides: Partial<TransformerContext>
  ): TransformerContext {
    return {
      ext: ".ts",
      mayContainFlow: false,
      isNodeModule: false,
      srcSyntax: "ts",
      ...overrides,
    } as TransformerContext;
  }

  const mockArgs: BabelTransformerArgs = {
    src: "const x = 1;",
    filename: "test.ts",
    options: {} as BabelTransformerArgs["options"],
    plugins: [],
  };

  function update(ctx: TransformerContext, src?: string) {
    const args = src ? { ...mockArgs, src } : mockArgs;
    updateTransformerContext(ctx, args);
  }

  it("enables native transform for TS files by default", () => {
    const ctx = makeContext({ srcSyntax: "ts" });
    update(ctx);
    equal(ctx.nativeTransform, true);
    equal(ctx.handleTs, true);
  });

  it("enables handleJsx for TSX when handleJsx option is set", () => {
    const ctx = makeContext({
      srcSyntax: "tsx",
      handleJsx: true,
    });
    update(ctx);
    equal(ctx.handleJsx, true);
    equal(ctx.handleTs, true);
  });

  it("disables handleJsx for TS files even when option is set", () => {
    const ctx = makeContext({
      srcSyntax: "ts",
      handleJsx: true,
    });
    update(ctx);
    equal(ctx.handleJsx, false);
  });

  it("disables native transform for JS files when handleJs is not set", () => {
    const ctx = makeContext({
      ext: ".js",
      srcSyntax: "js",
    });
    update(ctx);
    ok(!ctx.nativeTransform, "nativeTransform should be falsy");
    equal(ctx.handleTs, false);
  });

  it("enables native transform for JS files when handleJs and handleJsx are set and no flow", () => {
    const ctx = makeContext({
      ext: ".jsx",
      mayContainFlow: false,
      srcSyntax: "jsx",
      handleJs: true,
      handleJsx: true,
    });
    update(ctx);
    equal(ctx.nativeTransform, true);
    equal(ctx.handleJsx, true);
  });

  it("enables native transform for JS files even with mayContainFlow (esbuild catches errors)", () => {
    const ctx = makeContext({
      ext: ".js",
      mayContainFlow: true,
      srcSyntax: "js",
      handleJs: true,
      handleJsx: true,
    });
    update(ctx);
    equal(ctx.nativeTransform, true);
    equal(ctx.handleJsx, false); // jsx only for .jsx files
  });

  it("disables everything when nativeTransform is false", () => {
    const ctx = makeContext({
      srcSyntax: "tsx",
      nativeTransform: false,
      handleJsx: true,
    });
    update(ctx);
    equal(ctx.nativeTransform, false);
  });

  it("populates configDisabledPlugins for TS handling", () => {
    const ctx = makeContext({ srcSyntax: "ts" });
    update(ctx);
    ok(ctx.configDisabledPlugins?.has("transform-typescript"));
  });

  it("populates configDisabledPlugins for JSX handling", () => {
    const ctx = makeContext({
      srcSyntax: "tsx",
      handleJsx: true,
    });
    update(ctx);
    ok(ctx.configDisabledPlugins?.has("transform-react-jsx"));
    ok(ctx.configDisabledPlugins?.has("transform-react-jsx-source"));
    ok(ctx.configDisabledPlugins?.has("transform-react-jsx-self"));
  });

  it("populates configDisabledPlugins for module handling", () => {
    const ctx = makeContext({
      srcSyntax: "ts",
      handleModules: true,
    });
    update(ctx);
    ok(ctx.configDisabledPlugins?.has("transform-modules-commonjs"));
  });

  it("does not populate configDisabledPlugins when native transform is off", () => {
    const ctx = makeContext({
      srcSyntax: "ts",
      nativeTransform: false,
    });
    update(ctx);
    equal(ctx.configDisabledPlugins, undefined);
  });
});
