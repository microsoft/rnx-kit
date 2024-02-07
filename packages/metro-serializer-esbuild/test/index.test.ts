import type { Config } from "@react-native-community/cli-types";
import type { BundleArgs } from "@rnx-kit/metro-service";
import { bundle, loadMetroConfig } from "@rnx-kit/metro-service";
import type Bundle from "metro/src/shared/output/bundle";
import * as path from "node:path";

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

  return bundle(args, config, output);
}

describe("metro-serializer-esbuild", () => {
  jest.setTimeout(90000);

  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  const root = path.dirname(__dirname);

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
        reactNativePath: path.resolve(root, "node_modules", "react-native"),
        dependencies: {},
        commands: [],
        healthChecks: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        platforms: { android: {}, ios: {} } as any,
        project: {},
        reactNativeVersion: "",
      },
      {
        ...require("metro/src/shared/output/bundle"),
        save: ({ code }) => {
          result = code;
        },
      }
    );
    return result.split("\n");
  }

  beforeEach(() => {
    consoleWarnSpy.mockReset();
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  test("removes unused code", async () => {
    const result = await bundle("test/__fixtures__/direct.ts");
    expect(result).toEqual([
      '"use strict";',
      "(() => {",
      "  // virtual:metro:__rnx_prelude__",
      '  var global = new Function("return this;")();',
      "",
      "  // test/__fixtures__/base.ts",
      "  function app() {",
      '    "this should _not_ be removed";',
      "  }",
      "",
      "  // test/__fixtures__/direct.ts",
      "  app();",
      "})();",
      "",
    ]);
  });

  test("removes unused code (export *)", async () => {
    const result = await bundle("test/__fixtures__/exportAll.ts");
    expect(result).toEqual([
      '"use strict";',
      "(() => {",
      "  // virtual:metro:__rnx_prelude__",
      '  var global = new Function("return this;")();',
      "",
      "  // test/__fixtures__/base.ts",
      "  function app() {",
      '    "this should _not_ be removed";',
      "  }",
      "",
      "  // test/__fixtures__/exportAll.ts",
      "  app();",
      "})();",
      "",
    ]);
  });

  test("removes unused code (nested export *)", async () => {
    const result = await bundle("test/__fixtures__/nestedExportAll.ts");
    expect(result).toEqual([
      '"use strict";',
      "(() => {",
      "  // virtual:metro:__rnx_prelude__",
      '  var global = new Function("return this;")();',
      "",
      "  // test/__fixtures__/base.ts",
      "  function app() {",
      '    "this should _not_ be removed";',
      "  }",
      "",
      "  // test/__fixtures__/nestedExportAll.ts",
      "  app();",
      "})();",
      "",
    ]);
  });

  test("removes unused code (import *)", async () => {
    const result = await bundle("test/__fixtures__/importAll.ts");
    expect(result).toEqual([
      '"use strict";',
      "(() => {",
      "  // virtual:metro:__rnx_prelude__",
      '  var global = new Function("return this;")();',
      "",
      "  // test/__fixtures__/base.ts",
      "  function app() {",
      '    "this should _not_ be removed";',
      "  }",
      "",
      "  // test/__fixtures__/importAll.ts",
      "  app();",
      "})();",
      "",
    ]);
  });

  test("removes unused code (import * <- export *)", async () => {
    const result = await bundle("test/__fixtures__/importExportAll.ts");
    expect(result).toEqual([
      '"use strict";',
      "(() => {",
      "  // virtual:metro:__rnx_prelude__",
      '  var global = new Function("return this;")();',
      "",
      "  // test/__fixtures__/base.ts",
      "  function app() {",
      '    "this should _not_ be removed";',
      "  }",
      "",
      "  // test/__fixtures__/importExportAll.ts",
      "  app();",
      "})();",
      "",
    ]);
  });

  test("tree-shakes lodash-es", async () => {
    const _head = require.resolve("lodash-es/head.js", { paths: ["."] });
    const result = await bundle("test/__fixtures__/lodash-es.ts");
    expect(result).toEqual([
      '"use strict";',
      "(() => {",
      "  // virtual:metro:__rnx_prelude__",
      '  var global = new Function("return this;")();',
      "",
      `  // ${path.relative(root, _head).replace(/[\\]/g, "/")}`,
      "  function head(array) {",
      "    return array && array.length ? array[0] : void 0;",
      "  }",
      "  var head_default = head;",
      "",
      "  // test/__fixtures__/lodash-es.ts",
      "  console.log(head_default([]));",
      "})();",
      "",
    ]);
  });

  test("handles `sideEffects` array", async () => {
    const importResolve = (spec: string, parent = ".") => {
      const m = require.resolve(spec, { paths: [parent] });
      return path
        .relative(root, m)
        .replace(/[\\]/g, "/")
        .replace("/lib-commonjs/", "/lib/");
    };

    const fluentUtils = importResolve("@fluentui/utilities");
    const fluentSetVersion = importResolve(
      "@fluentui/set-version",
      path.join(root, fluentUtils)
    );

    const result = await bundle("test/__fixtures__/sideEffectsArray.ts");
    expect(result).toEqual([
      '"use strict";',
      "(() => {",
      "  var __getOwnPropNames = Object.getOwnPropertyNames;",
      "  var __esm = (fn, res) => function __init() {",
      "    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;",
      "  };",
      "",
      "  // virtual:metro:__rnx_prelude__",
      "  var global;",
      "  var init_rnx_prelude = __esm({",
      '    "virtual:metro:__rnx_prelude__"() {',
      '      global = new Function("return this;")();',
      "    }",
      "  });",
      "",
      "  // test/__fixtures__/sideEffectsArray.ts",
      "  init_rnx_prelude();",
      "",
      `  // ${fluentUtils}`,
      "  init_rnx_prelude();",
      "",
      `  // ${fluentSetVersion}`,
      "  init_rnx_prelude();",
      "",
      `  // ${fluentSetVersion.replace("index.js", "setVersion.js")}`,
      "  init_rnx_prelude();",
      "  var packagesCache = {};",
      "  var _win = void 0;",
      "  try {",
      "    _win = window;",
      "  } catch (e) {",
      "  }",
      "  function setVersion(packageName, packageVersion) {",
      '    if (typeof _win !== "undefined") {',
      "      var packages = _win.__packages__ = _win.__packages__ || {};",
      "      if (!packages[packageName] || !packagesCache[packageName]) {",
      "        packagesCache[packageName] = packageVersion;",
      "        var versions = packages[packageName] = packages[packageName] || [];",
      "        versions.push(packageVersion);",
      "      }",
      "    }",
      "  }",
      "",
      `  // ${fluentSetVersion}`,
      '  setVersion("@fluentui/set-version", "6.0.0");',
      "",
      `  // ${fluentUtils.replace("index.js", "warn/warn.js")}`,
      "  init_rnx_prelude();",
      "  var _warningCallback = void 0;",
      "  function warn(message) {",
      "    if (_warningCallback && false) {",
      "      _warningCallback(message);",
      "    } else if (console && console.warn) {",
      "      console.warn(message);",
      "    }",
      "  }",
      "",
      `  // ${fluentUtils.replace("index.js", "warn.js")}`,
      "  init_rnx_prelude();",
      "",
      `  // ${fluentUtils.replace("index.js", "version.js")}`,
      "  init_rnx_prelude();",
      '  setVersion("@fluentui/utilities", "8.13.9");',
      "",
      "  // test/__fixtures__/sideEffectsArray.ts",
      '  warn("this should _not_ be removed");',
      "})();",
      "",
    ]);
  });

  test("adds sourceMappingURL comment", async () => {
    const result = await bundle(
      "test/__fixtures__/direct.ts",
      false,
      ".test-output.jsbundle.map"
    );
    expect(result).toEqual([
      '"use strict";',
      "(() => {",
      "  // virtual:metro:__rnx_prelude__",
      '  var global = new Function("return this;")();',
      "",
      "  // test/__fixtures__/base.ts",
      "  function app() {",
      '    "this should _not_ be removed";',
      "  }",
      "",
      "  // test/__fixtures__/direct.ts",
      "  app();",
      "})();",
      "//# sourceMappingURL=.test-output.jsbundle.map",
      "",
    ]);
  });

  test("is disabled when `dev: true`", async () => {
    const result = await bundle("test/__fixtures__/direct.ts", true);
    expect(result[0]).toMatch(
      "var __BUNDLE_START_TIME__=this.nativePerformanceNow?nativePerformanceNow():Date.now(),__DEV__=true,process=this.process||{},__METRO_GLOBAL_PREFIX__=''"
    );
  });
});
