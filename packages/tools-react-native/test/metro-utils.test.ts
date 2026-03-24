import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeTransformerConfigs } from "../src/metro-utils.ts";

describe("mergeTransformerConfigs()", () => {
  it("returns an empty config when called with no arguments", () => {
    const result = mergeTransformerConfigs();
    deepEqual(result, {});
  });

  it("passes through a single config unchanged", () => {
    const config = {
      minifierPath: "/path/to/minifier",
      hermesParser: true,
    };
    const result = mergeTransformerConfigs(config);
    deepEqual(result, config);
  });

  it("merges scalar properties from multiple configs", () => {
    const result = mergeTransformerConfigs(
      { minifierPath: "/minifier-a", hermesParser: false },
      { minifierPath: "/minifier-b", enableBabelRuntime: true }
    );
    equal(result.minifierPath, "/minifier-b");
    equal(result.hermesParser, false);
    equal(result.enableBabelRuntime, true);
  });

  it("later configs override earlier ones", () => {
    const result = mergeTransformerConfigs(
      { hermesParser: false },
      { hermesParser: true }
    );
    equal(result.hermesParser, true);
  });

  it("skips nullish configs", () => {
    const config = { hermesParser: true };
    // @ts-expect-error testing nullish values
    const result = mergeTransformerConfigs(null, config, undefined);
    deepEqual(result, config);
  });

  it("preserves a single getTransformOptions without wrapping", () => {
    const getTransformOptions = async () => ({
      transform: { experimentalImportSupport: true },
    });
    const result = mergeTransformerConfigs({ getTransformOptions });
    equal(result.getTransformOptions, getTransformOptions);
  });

  it("merges multiple getTransformOptions functions", async () => {
    const result = mergeTransformerConfigs(
      {
        getTransformOptions: async () => ({
          transform: {
            experimentalImportSupport: false,
            inlineRequires: false,
          },
        }),
      },
      {
        getTransformOptions: async () => ({
          transform: {
            experimentalImportSupport: true,
            nonInlinedRequires: ["react"],
          },
        }),
      }
    );

    const options = await result.getTransformOptions!(
      [],
      { dev: true, hot: true, platform: "ios" },
      async () => []
    );

    deepEqual(options, {
      transform: {
        experimentalImportSupport: true,
        inlineRequires: false,
        nonInlinedRequires: ["react"],
      },
    });
  });

  it("merges inlineRequires blockLists when both are objects", async () => {
    const result = mergeTransformerConfigs(
      {
        getTransformOptions: async () => ({
          transform: {
            inlineRequires: { blockList: { "/path/a.js": true as const } },
          },
        }),
      },
      {
        getTransformOptions: async () => ({
          transform: {
            inlineRequires: { blockList: { "/path/b.js": true as const } },
          },
        }),
      }
    );

    const options = await result.getTransformOptions!(
      [],
      { dev: true, hot: true, platform: null },
      async () => []
    );

    deepEqual(options.transform?.inlineRequires, {
      blockList: { "/path/a.js": true, "/path/b.js": true },
    });
  });

  it("overrides inlineRequires when types differ", async () => {
    const result = mergeTransformerConfigs(
      {
        getTransformOptions: async () => ({
          transform: {
            inlineRequires: { blockList: { "/path/a.js": true as const } },
          },
        }),
      },
      {
        getTransformOptions: async () => ({
          transform: { inlineRequires: true },
        }),
      }
    );

    const options = await result.getTransformOptions!(
      [],
      { dev: true, hot: true, platform: null },
      async () => []
    );

    equal(options.transform?.inlineRequires, true);
  });

  it("merges preloadedModules maps", async () => {
    const result = mergeTransformerConfigs(
      {
        getTransformOptions: async () => ({
          preloadedModules: { "/mod/a.js": true as const },
        }),
      },
      {
        getTransformOptions: async () => ({
          preloadedModules: { "/mod/b.js": true as const },
        }),
      }
    );

    const options = await result.getTransformOptions!(
      [],
      { dev: true, hot: true, platform: null },
      async () => []
    );

    deepEqual(options.preloadedModules, {
      "/mod/a.js": true,
      "/mod/b.js": true,
    });
  });

  it("passes arguments through to all getTransformOptions functions", async () => {
    const calls: unknown[][] = [];

    const result = mergeTransformerConfigs(
      {
        getTransformOptions: async (entryPoints, options, _getDepsOf) => {
          calls.push(["first", [...entryPoints], { ...options }]);
          return {};
        },
      },
      {
        getTransformOptions: async (entryPoints, options, _getDepsOf) => {
          calls.push(["second", [...entryPoints], { ...options }]);
          return {};
        },
      }
    );

    const entryPoints = ["/app/index.js"];
    const opts = { dev: false, hot: true as const, platform: "android" };
    const getDepsOf = async () => ["/dep.js"];

    await result.getTransformOptions!(entryPoints, opts, getDepsOf);

    equal(calls.length, 2);
    deepEqual(calls[0], ["first", ["/app/index.js"], opts]);
    deepEqual(calls[1], ["second", ["/app/index.js"], opts]);
  });

  it("merges non-getTransformOptions props alongside wrapped getTransformOptions", async () => {
    const result = mergeTransformerConfigs(
      {
        minifierPath: "/minifier",
        getTransformOptions: async () => ({
          transform: { inlineRequires: false },
        }),
      },
      {
        hermesParser: true,
        getTransformOptions: async () => ({
          transform: { experimentalImportSupport: true },
        }),
      }
    );

    equal(result.minifierPath, "/minifier");
    equal(result.hermesParser, true);

    const options = await result.getTransformOptions!(
      [],
      { dev: true, hot: true, platform: null },
      async () => []
    );

    deepEqual(options, {
      transform: {
        inlineRequires: false,
        experimentalImportSupport: true,
      },
    });
  });
});
