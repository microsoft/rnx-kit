// @ts-check
"use strict";

describe("@rnx-kit/metro-config", () => {
  const { spawnSync } = require("child_process");
  const path = require("path");
  const {
    UNIQUE_PACKAGES,
    defaultWatchFolders,
    excludeExtraCopiesOf,
    exclusionList,
    makeBabelConfig,
    makeMetroConfig,
  } = require("../src/index");

  const defaultExclusionList =
    ".*\\.ProjectImports\\.zip|node_modules\\/react\\/dist\\/.*|website\\/node_modules\\/.*|heapCapture\\/bundle\\.js|.*\\/__tests__\\/.*";

  const babelConfigKeys = ["presets", "overrides"];
  const babelConfigPresets = ["module:metro-react-native-babel-preset"];
  const babelTypeScriptTest = "\\.tsx?$";

  const metroConfigKeys = [
    "resolver",
    "serializer",
    "server",
    "symbolicator",
    "transformer",
    "watchFolders",
  ];

  const currentWorkingDir = process.cwd();

  /**
   * Generates a sequence from RegEx matches.
   * @param {string} str
   * @param {RegExp} regex
   * @returns {Generator<string, void>}
   */
  function* generateSequence(str, regex) {
    let m = regex.exec(str);
    while (m) {
      yield m[1];
      m = regex.exec(str);
    }
  }

  /**
   * Returns path to specified test fixture.
   * @param {string} name
   */
  function fixturePath(name) {
    return path.join(currentWorkingDir, "test", "__fixtures__", name);
  }

  /**
   * Sets current working directory to specified test fixture.
   * @param {string} name
   */
  function setFixture(name) {
    process.chdir(fixturePath(name));
  }

  afterEach(() => process.chdir(currentWorkingDir));

  test("defaultWatchFolders() returns an empty list outside a monorepo", () => {
    const root = process.platform === "win32" ? "C:\\" : "/";
    expect(defaultWatchFolders(root).length).toBe(0);
  });

  test("defaultWatchFolders() returns packages in a monorepo", () => {
    setFixture("awesome-repo/packages/t-800");

    const repoRoot = path.dirname(path.dirname(process.cwd()));
    const folders = defaultWatchFolders(process.cwd());

    const packages = ["conan", "dutch", "john", "quaid", "t-800"].map((p) =>
      path.join(repoRoot, "packages", p)
    );
    const expectedFolders = [
      path.join(repoRoot, "node_modules"),
      ...packages,
    ].sort();
    expect(folders.sort()).toEqual(expectedFolders);
  });

  test("excludeExtraCopiesOf() throws if a package is not found", () => {
    expect(excludeExtraCopiesOf("jest", process.cwd())).toBeDefined();

    const packageName = "this-package-does-not-exist";
    expect(() => excludeExtraCopiesOf(packageName, process.cwd())).toThrowError(
      `Failed to find '${packageName}'`
    );
  });

  test("exclusionList() ignores extra copies of react and react-native", () => {
    const repo = fixturePath("awesome-repo").replace(/\//g, "\\/");

    // /rnx-kit/packages/metro-config/test/__fixtures__/awesome-repo/packages/john/node_modules/react-native
    const packageCopy = `(?<!${repo}\\/packages\\/john)\\/node_modules\\/react-native\\/.*`;

    // /rnx-kit/packages/metro-config/test/__fixtures__/awesome-repo/node_modules/react
    const reactCopy = `(?<!${repo})\\/node_modules\\/react\\/.*`;

    // /rnx-kit/packages/metro-config/test/__fixtures__/awesome-repo/node_modules/react-native
    const projectCopy = `(?<!${repo})\\/node_modules\\/react-native\\/.*`;

    // Conan does not have a local copy of react-native. It should
    // exclude all but the repo's copy.
    setFixture("awesome-repo/packages/conan");
    expect(exclusionList().source).toBe(
      `(${reactCopy}|${projectCopy}|${defaultExclusionList})$`
    );

    // John has a local copy of react-native and should ignore all other copies.
    setFixture("awesome-repo/packages/john");
    expect(exclusionList().source).toBe(
      `(${reactCopy}|${packageCopy}|${defaultExclusionList})$`
    );
  });

  test("exclusionList() returns additional exclusions", () => {
    const repoReactNative = path.dirname(
      require.resolve("react-native/package.json")
    );
    const repoRoot = path
      .dirname(path.dirname(repoReactNative))
      .replace(/\//g, "\\/");

    const react = `(?<!${repoRoot})\\/node_modules\\/react\\/.*`;
    const reactNative = `(?<!${repoRoot})\\/node_modules\\/react-native\\/.*`;

    expect(exclusionList().source).toBe(
      `(${react}|${reactNative}|${defaultExclusionList})$`
    );
    expect(exclusionList([/.*[\/\\]__fixtures__[\/\\].*/]).source).toBe(
      `(${react}|${reactNative}|.*\\.ProjectImports\\.zip|.*[\\/\\\\]__fixtures__[\\/\\\\].*|node_modules\\/react\\/dist\\/.*|website\\/node_modules\\/.*|heapCapture\\/bundle\\.js|.*\\/__tests__\\/.*)$`
    );
  });

  test("makeBabelConfig() returns default Babel config", () => {
    const config = makeBabelConfig();
    expect(Object.keys(config)).toEqual(babelConfigKeys);
    expect(config.presets).toEqual(babelConfigPresets);

    if (!Array.isArray(config.overrides)) {
      fail("Expected `config.overrides` to be an array");
    }

    expect(config.overrides.length).toBe(1);

    if (!(config.overrides[0].test instanceof RegExp)) {
      fail("Expected `config.overrides[0]` to be a RegExp");
    }

    expect(config.overrides[0].test.source).toBe(babelTypeScriptTest);
    expect(config.overrides[0].plugins).toEqual(["const-enum"]);
  });

  test("makeBabelConfig() returns a Babel config with additional plugins", () => {
    const config = makeBabelConfig([
      "src/babel-plugin-import-path-remapper.js",
    ]);
    expect(Object.keys(config)).toEqual(babelConfigKeys);
    expect(config.presets).toEqual(babelConfigPresets);

    if (!Array.isArray(config.overrides)) {
      fail("Expected `config.overrides` to be an array");
    }

    expect(config.overrides.length).toBe(1);

    if (!(config.overrides[0].test instanceof RegExp)) {
      fail("Expected `config.overrides[0]` to be a RegExp");
    }

    expect(config.overrides[0].test.source).toBe(babelTypeScriptTest);
    expect(config.overrides[0].plugins).toEqual([
      "const-enum",
      "src/babel-plugin-import-path-remapper.js",
    ]);
  });

  test("makeMetroConfig() returns a default Metro config", async () => {
    const config = makeMetroConfig();
    expect(Object.keys(config).sort()).toEqual(metroConfigKeys);

    if (!config.resolver) {
      fail("Expected `config.resolver` to be defined");
    } else if (!config.resolver.extraNodeModules) {
      fail("Expected `config.resolver.extraNodeModules` to be defined");
    } else if (!(config.resolver.blacklistRE instanceof RegExp)) {
      fail("Expected `config.resolver.blacklistRE` to be a RegExp");
    } else if (!(config.resolver.blockList instanceof RegExp)) {
      fail("Expected `config.resolver.blockList` to be a RegExp");
    } else if (!config.transformer) {
      fail("Expected `config.transformer` to be defined");
    } else if (!Array.isArray(config.watchFolders)) {
      fail("Expected `config.watchFolders` to be an array");
    }

    expect(Object.keys(config.resolver.extraNodeModules)).toEqual(
      UNIQUE_PACKAGES
    );

    const blockList = exclusionList().source;
    expect(config.resolver.blacklistRE.source).toBe(blockList);
    expect(config.resolver.blockList.source).toBe(blockList);

    const transformerOptions = await config.transformer.getTransformOptions();
    expect(transformerOptions.transform).toEqual({
      experimentalImportSupport: false,
      inlineRequires: false,
    });

    expect(config.watchFolders.length).toBeGreaterThan(0);
  });

  test("makeMetroConfig() merges Metro configs", async () => {
    const config = makeMetroConfig({
      projectRoot: __dirname,
      resetCache: true,
    });

    expect(Object.keys(config).sort()).toEqual(
      metroConfigKeys.concat(["projectRoot", "resetCache"]).sort()
    );

    expect(config.projectRoot).toBe(__dirname);
    expect(config.resetCache).toBeTruthy();

    if (!config.resolver) {
      fail("Expected `config.resolver` to be defined");
    } else if (!config.resolver.extraNodeModules) {
      fail("Expected `config.resolver.extraNodeModules` to be defined");
    } else if (!(config.resolver.blacklistRE instanceof RegExp)) {
      fail("Expected `config.resolver.blacklistRE` to be a RegExp");
    } else if (!(config.resolver.blockList instanceof RegExp)) {
      fail("Expected `config.resolver.blockList` to be a RegExp");
    } else if (!config.transformer) {
      fail("Expected `config.transformer` to be defined");
    } else if (!Array.isArray(config.watchFolders)) {
      fail("Expected `config.watchFolders` to be an array");
    }

    expect(Object.keys(config.resolver.extraNodeModules)).toEqual(
      UNIQUE_PACKAGES
    );

    const blockList = exclusionList().source;
    expect(config.resolver.blacklistRE.source).toBe(blockList);
    expect(config.resolver.blockList.source).toBe(blockList);

    const transformerOptions = await config.transformer.getTransformOptions();
    expect(transformerOptions.transform).toEqual({
      experimentalImportSupport: false,
      inlineRequires: false,
    });

    expect(config.watchFolders.length).toBeGreaterThan(0);
  });

  test("makeMetroConfig() merges `extraNodeModules`", async () => {
    const config = makeMetroConfig({
      projectRoot: __dirname,
      resolver: {
        extraNodeModules: {
          "my-awesome-package": "/skynet",
          "react-native": "/skynet",
        },
      },
    });

    const extraNodeModules =
      config.resolver && config.resolver.extraNodeModules;
    if (!extraNodeModules) {
      fail("Expected config.resolver.extraNodeModules to be set");
    }

    expect(Object.keys(extraNodeModules).sort()).toEqual([
      "my-awesome-package",
      "react",
      "react-native",
    ]);

    expect(extraNodeModules["my-awesome-package"]).toBe("/skynet");
    expect(extraNodeModules["react-native"]).toBe("/skynet");
  });

  test("packs only necessary files", () => {
    const files = Array.from(
      generateSequence(
        spawnSync("npm", ["pack", "--dry-run"]).output.toString(),
        /[.\d]+k?B\s+([^\s]*)/g
      )
    );
    expect(
      files.filter((file) => !file.startsWith("CHANGELOG")).sort()
    ).toEqual(["README.md", "package.json", "src/index.js"]);
  });
});
