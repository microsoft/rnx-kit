import type { Config } from "@react-native-community/cli-types";
import type { BundleArgs } from "@rnx-kit/metro-service";
import { bundle, loadMetroConfig } from "@rnx-kit/metro-service";
import type Bundle from "metro/private/shared/output/bundle";
import { ok } from "node:assert/strict";
import { createRequire } from "node:module";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { URL, fileURLToPath } from "node:url";

async function buildBundle(
  args: BundleArgs,
  ctx: Config,
  output: typeof Bundle
) {
  const config = await loadMetroConfig(ctx, {
    maxWorkers: args.maxWorkers,
    resetCache: args.resetCache,
    config: args.config,
  });

  config.resolver.extraNodeModules["@fluentui/react-window-provider"] =
    config.resolver.emptyModulePath;

  return bundle(args, config, output);
}

describe("metro-serializer-esbuild", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));

  before(() => {
    global.require = createRequire(root);
  });

  after(() => {
    // @ts-expect-error Tests are run in ESM mode where `require` is not defined
    global.require = undefined;
  });

  async function bundle(
    entryFile: string,
    dev = false,
    sourcemapOutput: string | undefined = undefined
  ): Promise<string[]> {
    let result = "";
    await buildBundle(
      {
        entryFile,
        bundleEncoding: "utf8",
        bundleOutput: ".test-output.jsbundle",
        dev,
        platform: "ios",
        resetCache: true,
        resetGlobalCache: false,
        sourcemapOutput,
        sourcemapUseAbsolutePath: true,
        verbose: false,
      },
      {
        root,
        reactNativePath: path.dirname(
          require.resolve("react-native/package.json")
        ),
        dependencies: {},
        assets: [],
        commands: [],
        healthChecks: [],
        // oxlint-disable-next-line typescript/no-explicit-any
        platforms: { android: {}, ios: {} } as any,
        project: {},
        reactNativeVersion: "",
      },
      {
        ...require("metro/private/shared/output/bundle"),
        save: ({ code }) => {
          result = code;
        },
      }
    );
    return result.split("\n");
  }

  it("removes unused code", async (t) => {
    t.assert.snapshot(await bundle("test/__fixtures__/direct.ts"));
  });

  it("removes unused code (export *)", async (t) => {
    t.assert.snapshot(await bundle("test/__fixtures__/exportAll.ts"));
  });

  it("removes unused code (nested export *)", async (t) => {
    t.assert.snapshot(await bundle("test/__fixtures__/nestedExportAll.ts"));
  });

  it("removes unused code (import *)", async (t) => {
    t.assert.snapshot(await bundle("test/__fixtures__/importAll.ts"));
  });

  it("removes unused code (import * <- export *)", async (t) => {
    t.assert.snapshot(await bundle("test/__fixtures__/importExportAll.ts"));
  });

  it("tree-shakes lodash-es", async (t) => {
    t.assert.snapshot(await bundle("test/__fixtures__/lodash-es.ts"));
  });

  it("handles `sideEffects` array", async (t) => {
    t.assert.snapshot(await bundle("test/__fixtures__/sideEffectsArray.ts"));
  });

  it("adds sourceMappingURL comment", async (t) => {
    t.assert.snapshot(
      await bundle(
        "test/__fixtures__/direct.ts",
        false,
        ".test-output.jsbundle.map"
      )
    );
  });

  it("is disabled when `dev: true`", async () => {
    const result = await bundle("test/__fixtures__/direct.ts", true);
    ok(result[0].includes("__DEV__=true"));
  });

  it("preserves template literals", async (t) => {
    t.assert.snapshot(await bundle("test/__fixtures__/templateLiterals.ts"));
  });
});
