import buildBundle from "@react-native-community/cli-plugin-metro/build/commands/bundle/buildBundle";
import * as path from "path";

describe("metro-serializer-esbuild", () => {
  jest.setTimeout(60000);

  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  async function bundle(entryFile: string): Promise<string> {
    let result: string | undefined = undefined;
    await buildBundle(
      {
        entryFile,
        bundleEncoding: "utf8",
        bundleOutput: ".test-output.jsbundle",
        dev: true,
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
});
