import type { Config } from "@react-native-community/cli-types";
import type { BundleArgs } from "@rnx-kit/metro-service";
import { bundle, loadMetroConfig } from "@rnx-kit/metro-service";
import type Bundle from "metro/private/shared/output/bundle";
import { deepEqual, ok } from "node:assert/strict";
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

  it("tree-shakes lodash-es", async () => {
    const _head = require.resolve("lodash-es/head.js", { paths: ["."] });
    const _lodash = require.resolve("lodash-es/lodash.js", { paths: ["."] });
    const result = await bundle("test/__fixtures__/lodash-es.ts");
    deepEqual(result, [
      "(() => {",
      "  var __defProp = Object.defineProperty;",
      "  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;",
      "  var __getOwnPropNames = Object.getOwnPropertyNames;",
      "  var __hasOwnProp = Object.prototype.hasOwnProperty;",
      "  var __esm = (fn, res) => function __init() {",
      "    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;",
      "  };",
      "  var __copyProps = (to, from, except, desc) => {",
      '    if (from && typeof from === "object" || typeof from === "function")',
      "      for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {",
      "        key = keys[i];",
      "        if (!__hasOwnProp.call(to, key) && key !== except)",
      "          __defProp(to, key, { get: ((k) => from[k]).bind(null, key), enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });",
      "      }",
      "    return to;",
      "  };",
      '  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);',
      "",
      `  // ${path.relative(root, _head).replaceAll("\\", "/")}`,
      "  function head(array) {",
      "    return array && array.length ? array[0] : void 0;",
      "  }",
      "  var head_default;",
      "  var init_head = __esm({",
      `    "${path.relative(root, _head).replaceAll("\\", "/")}"() {`,
      '      "use strict";',
      "      head_default = head;",
      "    }",
      "  });",
      "",
      `  // ${path.relative(root, _lodash).replaceAll("\\", "/")}`,
      "  var init_lodash = __esm({",
      `    "${path.relative(root, _lodash).replaceAll("\\", "/")}"() {`,
      '      "use strict";',
      "      init_head();",
      "    }",
      "  });",
      "",
      "  // test/__fixtures__/lodash-es.ts",
      "  var lodash_es_exports = {};",
      "  var init_lodash_es = __esm({",
      '    "test/__fixtures__/lodash-es.ts"() {',
      '      "use strict";',
      "      init_lodash();",
      "      console.log(head_default([]));",
      "    }",
      "  });",
      "",
      "  // virtual:metro:__rnx_prelude__",
      '  global = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : new Function("return this;")();',
      "  init_lodash_es();",
      "})();",
      "",
    ]);
  });

  it("handles `sideEffects` array", async () => {
    const importResolve = (spec: string, parent = ".") => {
      const m = require.resolve(spec, { paths: [parent] });
      return path
        .relative(root, m)
        .replaceAll("\\", "/")
        .replace("/lib-commonjs/", "/lib/");
    };

    const fluentUtils = importResolve("@fluentui/utilities");
    const fluentSetVersion = importResolve(
      "@fluentui/set-version",
      path.join(root, fluentUtils)
    );

    const result = await bundle("test/__fixtures__/sideEffectsArray.ts");
    deepEqual(result, [
      "(() => {",
      "  var __defProp = Object.defineProperty;",
      "  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;",
      "  var __getOwnPropNames = Object.getOwnPropertyNames;",
      "  var __hasOwnProp = Object.prototype.hasOwnProperty;",
      "  var __esm = (fn, res) => function __init() {",
      "    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;",
      "  };",
      "  var __copyProps = (to, from, except, desc) => {",
      '    if (from && typeof from === "object" || typeof from === "function")',
      "      for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {",
      "        key = keys[i];",
      "        if (!__hasOwnProp.call(to, key) && key !== except)",
      "          __defProp(to, key, { get: ((k) => from[k]).bind(null, key), enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });",
      "      }",
      "    return to;",
      "  };",
      '  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);',
      "",
      `  // ${fluentUtils.replace("index.js", "warn/warn.js")}`,
      "  function warn(message) {",
      "    if (_warningCallback && false) {",
      "      _warningCallback(message);",
      "    } else if (console && console.warn) {",
      "      console.warn(message);",
      "    }",
      "  }",
      "  var _warningCallback;",
      "  var init_warn = __esm({",
      `    "${fluentUtils.replace("index.js", "warn/warn.js")}"() {`,
      '      "use strict";',
      "      _warningCallback = void 0;",
      "    }",
      "  });",
      "",
      `  // ${fluentUtils.replace("index.js", "warn.js")}`,
      "  var init_warn2 = __esm({",
      `    "${fluentUtils.replace("index.js", "warn.js")}"() {`,
      '      "use strict";',
      "      init_warn();",
      "    }",
      "  });",
      "",
      `  // ${fluentSetVersion.replace("index.js", "setVersion.js")}`,
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
      "  var packagesCache, _win;",
      "  var init_setVersion = __esm({",
      `    "${fluentSetVersion.replace("index.js", "setVersion.js")}"() {`,
      '      "use strict";',
      "      packagesCache = {};",
      "      _win = void 0;",
      "      try {",
      "        _win = window;",
      "      } catch (e) {",
      "      }",
      "    }",
      "  });",
      "",
      `  // ${fluentSetVersion}`,
      "  var init_lib = __esm({",
      `    "${fluentSetVersion}"() {`,
      '      "use strict";',
      "      init_setVersion();",
      '      setVersion("@fluentui/set-version", "6.0.0");',
      "    }",
      "  });",
      "",
      `  // ${fluentUtils.replace("index.js", "version.js")}`,
      "  var init_version = __esm({",
      `    "${fluentUtils.replace("index.js", "version.js")}"() {`,
      '      "use strict";',
      "      init_lib();",
      '      setVersion("@fluentui/utilities", "8.17.2");',
      "    }",
      "  });",
      "",
      `  // ${fluentUtils}`,
      "  var init_lib2 = __esm({",
      `    "${fluentUtils}"() {`,
      '      "use strict";',
      "      init_warn2();",
      "      init_version();",
      "    }",
      "  });",
      "",
      "  // test/__fixtures__/sideEffectsArray.ts",
      "  var sideEffectsArray_exports = {};",
      "  var init_sideEffectsArray = __esm({",
      '    "test/__fixtures__/sideEffectsArray.ts"() {',
      '      "use strict";',
      "      init_lib2();",
      '      warn("this should _not_ be removed");',
      "    }",
      "  });",
      "",
      "  // virtual:metro:__rnx_prelude__",
      '  global = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : new Function("return this;")();',
      "  init_sideEffectsArray();",
      "})();",
      "",
    ]);
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
