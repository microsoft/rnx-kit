import buildBundle from "@react-native-community/cli-plugin-metro/build/commands/bundle/buildBundle";
import * as path from "path";

describe("metro-serializer-esbuild", () => {
  jest.setTimeout(90000);

  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  async function bundle(entryFile: string, dev = true): Promise<string> {
    let result: string | undefined = undefined;
    await buildBundle(
      {
        entryFile,
        bundleEncoding: "utf8",
        bundleOutput: ".test-output.jsbundle",
        dev,
        platform: "native",
        resetCache: false,
        resetGlobalCache: false,
        sourcemapUseAbsolutePath: true,
        verbose: false,
      },
      {
        root: path.dirname(__dirname),
        reactNativePath: path.dirname(
          require.resolve("react-native/package.json")
        ),
        dependencies: {},
        commands: [],
        assets: [],
        healthChecks: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        platforms: { android: {}, ios: {} } as any,
        project: {},
      },
      {
        ...require("metro/src/shared/output/bundle"),
        save: ({ code }) => {
          result = code;
        },
      }
    );
    return result;
  }

  beforeEach(() => {
    consoleWarnSpy.mockReset();
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  test("removes unused code", async () => {
    const result = await bundle("test/__fixtures__/direct.ts");
    expect(result).toMatchInlineSnapshot(`
      "\\"use strict\\";
      (function() {
        // lib/index.js
        var global = new Function(\\"return this;\\")();

        // test/__fixtures__/base.ts
        function app() {
          \\"this should _not_ be removed\\";
        }

        // test/__fixtures__/direct.ts
        app();
      })();
      "
    `);
  });

  test("removes unused code (export *)", async () => {
    const result = await bundle("test/__fixtures__/exportAll.ts");
    expect(result).toMatchInlineSnapshot(`
      "\\"use strict\\";
      (function() {
        // lib/index.js
        var global = new Function(\\"return this;\\")();

        // test/__fixtures__/base.ts
        function app() {
          \\"this should _not_ be removed\\";
        }

        // test/__fixtures__/exportAll.ts
        app();
      })();
      "
    `);
  });

  test("removes unused code (nested export *)", async () => {
    const result = await bundle("test/__fixtures__/nestedExportAll.ts");
    expect(result).toMatchInlineSnapshot(`
      "\\"use strict\\";
      (function() {
        // lib/index.js
        var global = new Function(\\"return this;\\")();

        // test/__fixtures__/base.ts
        function app() {
          \\"this should _not_ be removed\\";
        }

        // test/__fixtures__/nestedExportAll.ts
        app();
      })();
      "
    `);
  });

  test("removes unused code (import *)", async () => {
    const result = await bundle("test/__fixtures__/importAll.ts");
    expect(result).toMatchInlineSnapshot(`
      "\\"use strict\\";
      (function() {
        // lib/index.js
        var global = new Function(\\"return this;\\")();

        // test/__fixtures__/base.ts
        function app() {
          \\"this should _not_ be removed\\";
        }

        // test/__fixtures__/importAll.ts
        app();
      })();
      "
    `);
  });

  test("removes unused code (import * <- export *)", async () => {
    const result = await bundle("test/__fixtures__/importExportAll.ts");
    expect(result).toMatchInlineSnapshot(`
      "\\"use strict\\";
      (function() {
        // lib/index.js
        var global = new Function(\\"return this;\\")();

        // test/__fixtures__/base.ts
        function app() {
          \\"this should _not_ be removed\\";
        }

        // test/__fixtures__/importExportAll.ts
        app();
      })();
      "
    `);
  });

  test("tree-shakes lodash-es", async () => {
    const result = await bundle("test/__fixtures__/lodash-es.ts");
    expect(result).toMatchInlineSnapshot(`
      "\\"use strict\\";
      (function() {
        // lib/index.js
        var global = new Function(\\"return this;\\")();

        // ../../node_modules/lodash-es/head.js
        function head(array) {
          return array && array.length ? array[0] : void 0;
        }
        var head_default = head;

        // test/__fixtures__/lodash-es.ts
        console.log(head_default([]));
      })();
      "
    `);
  });

  test("handles `sideEffects` array", async () => {
    const result = await bundle("test/__fixtures__/sideEffectsArray.ts");
    expect(result).toMatchInlineSnapshot(`
      "\\"use strict\\";
      (function() {
        var __getOwnPropNames = Object.getOwnPropertyNames;
        var __esm = function(fn, res) {
          return function __init() {
            return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
          };
        };

        // lib/index.js
        var global;
        var init_lib = __esm({
          \\"lib/index.js\\"() {
            \\"use strict\\";
            global = new Function(\\"return this;\\")();
          }
        });

        // test/__fixtures__/sideEffectsArray.ts
        init_lib();

        // ../../node_modules/@fluentui/utilities/lib/index.js
        init_lib();

        // ../../node_modules/@fluentui/set-version/lib/index.js
        init_lib();

        // ../../node_modules/@fluentui/set-version/lib/setVersion.js
        init_lib();
        var packagesCache = {};
        var _win = void 0;
        try {
          _win = window;
        } catch (e) {
        }
        function setVersion(packageName, packageVersion) {
          if (typeof _win !== \\"undefined\\") {
            var packages = _win.__packages__ = _win.__packages__ || {};
            if (!packages[packageName] || !packagesCache[packageName]) {
              packagesCache[packageName] = packageVersion;
              var versions = packages[packageName] = packages[packageName] || [];
              versions.push(packageVersion);
            }
          }
        }

        // ../../node_modules/@fluentui/set-version/lib/index.js
        setVersion(\\"@fluentui/set-version\\", \\"6.0.0\\");

        // ../../node_modules/@fluentui/utilities/lib/warn/warn.js
        init_lib();
        var _warningCallback = void 0;
        function warn(message) {
          if (_warningCallback && true) {
            _warningCallback(message);
          } else if (console && console.warn) {
            console.warn(message);
          }
        }

        // ../../node_modules/@fluentui/utilities/lib/warn.js
        init_lib();

        // ../../node_modules/@fluentui/utilities/lib/version.js
        init_lib();
        setVersion(\\"@fluentui/utilities\\", \\"8.8.3\\");

        // test/__fixtures__/sideEffectsArray.ts
        warn(\\"this should _not_ be removed\\");
      })();
      "
    `);
  });

  test('strips out `"use strict"`', async () => {
    const result = await bundle("test/__fixtures__/direct.ts", false);
    expect(result).toMatchInlineSnapshot(`
      "(function(){var e=new Function(\\"return this;\\")();})();
      "
    `);
  });
});
