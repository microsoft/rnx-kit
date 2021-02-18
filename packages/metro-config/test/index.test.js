// @ts-check
"use strict";

describe("@rnx-kit/metro-config", () => {
  const { spawnSync } = require("child_process");
  const path = require("path");
  const {
    defaultWatchFolders,
    exclusionList,
    makeBabelConfig,
    makeMetroConfig,
  } = require("../src");

  const defaultExclusionList =
    "node_modules\\/.*\\/node_modules\\/react-native\\/.*|.*\\.ProjectImports\\.zip|node_modules\\/react\\/dist\\/.*|website\\/node_modules\\/.*|heapCapture\\/bundle\\.js|.*\\/__tests__\\/.*";

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
   * Sets current working directory to specified test fixture.
   * @param {string} name
   */
  function setFixture(name) {
    process.chdir(path.join(currentWorkingDir, "test", "__fixtures__", name));
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

  test("exclusionList() ignores hoisted react-native if a local copy exists", () => {
    // /rnx-kit/packages/metro-config/test/__fixtures__/awesome-repo/node_modules/react-native
    const fixtureCopy = "..\\/..\\/node_modules\\/react-native\\/.*";

    // /rnx-kit/node_modules/react-native
    const repoCopy =
      "..\\/..\\/..\\/..\\/..\\/..\\/..\\/node_modules\\/react-native\\/.*";

    // Conan does not have a local copy of react-native but since we're
    // in a monorepo, we'll find the repo's copy.
    setFixture("awesome-repo/packages/conan");
    expect(exclusionList().source).toBe(
      `(${repoCopy}|${defaultExclusionList})$`
    );

    // John has a local copy of react-native and should ignore the
    // hoisted copy (in addition to the repo's own copy).
    setFixture("awesome-repo/packages/john");
    expect(exclusionList().source).toBe(
      `(${fixtureCopy}|${repoCopy}|${defaultExclusionList})$`
    );
  });

  test("exclusionList() returns additional exclusions", () => {
    expect(exclusionList().source).toBe(`(${defaultExclusionList})$`);
    expect(exclusionList([/.*[\/\\]__fixtures__[\/\\].*/]).source).toBe(
      "(node_modules\\/.*\\/node_modules\\/react-native\\/.*|.*\\.ProjectImports\\.zip|.*[\\/\\\\]__fixtures__[\\/\\\\].*|node_modules\\/react\\/dist\\/.*|website\\/node_modules\\/.*|heapCapture\\/bundle\\.js|.*\\/__tests__\\/.*)$"
    );
  });

  test("makeBabelConfig() returns default Babel config", () => {
    const config = makeBabelConfig();
    expect(Object.keys(config)).toEqual(babelConfigKeys);
    expect(config.presets).toEqual(babelConfigPresets);
    expect(config.overrides.length).toBe(1);
    expect(config.overrides[0].test.source).toBe(babelTypeScriptTest);
    expect(config.overrides[0].plugins).toEqual(["const-enum"]);
  });

  test("makeBabelConfig() returns a Babel config with additional plugins", () => {
    const config = makeBabelConfig([
      "src/babel-plugin-import-path-remapper.js",
    ]);
    expect(Object.keys(config)).toEqual(babelConfigKeys);
    expect(config.presets).toEqual(babelConfigPresets);
    expect(config.overrides.length).toBe(1);
    expect(config.overrides[0].test.source).toBe(babelTypeScriptTest);
    expect(config.overrides[0].plugins).toEqual([
      "const-enum",
      "src/babel-plugin-import-path-remapper.js",
    ]);
  });

  test("makeMetroConfig() returns a default Metro config", async () => {
    const config = makeMetroConfig();
    expect(Object.keys(config).sort()).toEqual(metroConfigKeys);

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
