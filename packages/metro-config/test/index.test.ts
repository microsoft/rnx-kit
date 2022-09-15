import * as fs from "node:fs";
import * as path from "node:path";
import { enhanceMiddleware } from "../src/assetPluginForMonorepos";
import {
  defaultWatchFolders,
  exclusionList,
  makeMetroConfig,
  resolveUniqueModule,
  UNIQUE_PACKAGES,
} from "../src/index";

describe("@rnx-kit/metro-config", () => {
  const currentWorkingDir = process.cwd();

  /**
   * Returns path to specified test fixture.
   */
  function fixturePath(name: string): string {
    return path.join(currentWorkingDir, "test", "__fixtures__", name);
  }

  /**
   * Sets current working directory to specified test fixture.
   */
  function setFixture(name: string): void {
    process.chdir(fixturePath(name));
  }

  afterEach(() => process.chdir(currentWorkingDir));

  test("defaultWatchFolders() returns an empty list outside a monorepo", () => {
    setFixture("app-repo");
    expect(defaultWatchFolders().length).toBe(0);
  });

  test("defaultWatchFolders() returns packages in a monorepo", () => {
    setFixture("awesome-repo/packages/t-800");
    const folders = defaultWatchFolders()
      .map((path) => path.replace(/\\/g, "/"))
      .sort();

    expect(folders).toEqual([
      expect.stringMatching(/__fixtures__[/\\]awesome-repo[/\\]node_modules$/),
      expect.stringMatching(
        /__fixtures__[/\\]awesome-repo[/\\]packages[/\\]conan$/
      ),
      expect.stringMatching(
        /__fixtures__[/\\]awesome-repo[/\\]packages[/\\]dutch$/
      ),
      expect.stringMatching(
        /__fixtures__[/\\]awesome-repo[/\\]packages[/\\]john$/
      ),
      expect.stringMatching(
        /__fixtures__[/\\]awesome-repo[/\\]packages[/\\]quaid$/
      ),
      expect.stringMatching(
        /__fixtures__[/\\]awesome-repo[/\\]packages[/\\]t-800$/
      ),
    ]);
  });

  test("resolveUniqueModule() ignores symlinks", () => {
    const repo = fixturePath("awesome-repo");
    const packageCopy = path.join(
      repo,
      "packages",
      "t-800",
      "node_modules",
      "react-native",
      "package.json"
    );
    const projectCopy = path.join(
      repo,
      "node_modules",
      "react-native",
      "package.json"
    );

    setFixture("awesome-repo/packages/t-800");

    expect(
      fs.lstatSync("node_modules/react-native").isSymbolicLink()
    ).toBeTruthy();

    const [reactNativePath, exclude] = resolveUniqueModule("react-native");
    expect(reactNativePath).toBe(path.dirname(projectCopy));
    expect(exclude.test(packageCopy)).toBeTruthy();
    expect(exclude.test(projectCopy)).toBeFalsy();
  });

  test("resolveUniqueModule() handles nested dependencies", () => {
    const repo = fixturePath("awesome-repo");
    const packageRnCopy = path.join(
      repo,
      "packages",
      "john",
      "node_modules",
      "react-native",
      "package.json"
    );
    const projectRnCopy = path.join(
      repo,
      "node_modules",
      "react-native",
      "package.json"
    );

    const packageMatrixCopy = path.join(
      repo,
      "packages",
      "john",
      "node_modules",
      "@commando",
      "matrix",
      "package.json"
    );
    const projectMatrixCopy = path.join(
      repo,
      "node_modules",
      "@commando",
      "matrix",
      "package.json"
    );

    setFixture("awesome-repo/packages/john");

    const [reactNativePath, excludeReactNative] =
      resolveUniqueModule("react-native");
    expect(reactNativePath).toBe(path.dirname(packageRnCopy));
    expect(excludeReactNative.test(packageRnCopy)).toBeFalsy();
    expect(excludeReactNative.test(projectRnCopy)).toBeTruthy();

    const [matrixPath, excludeMatrix] = resolveUniqueModule("@commando/matrix");
    expect(matrixPath).toBe(path.dirname(packageMatrixCopy));
    expect(excludeMatrix.test(packageMatrixCopy)).toBeFalsy();
    expect(excludeMatrix.test(projectMatrixCopy)).toBeTruthy();
  });

  test("resolveUniqueModule() throws if a package is not found", () => {
    expect(resolveUniqueModule("jest", process.cwd())).toBeDefined();

    const packageName = "this-package-does-not-exist";
    expect(() => resolveUniqueModule(packageName, process.cwd())).toThrowError(
      `Cannot find module '${packageName}'`
    );
  });

  test("resolveUniqueModule() escapes characters clashing with regex tokens", () => {
    const repo = fixturePath("pnpm-repo");
    const [rnPath, rnExclude] = resolveUniqueModule("react-native", repo);
    expect(rnPath).toMatch(
      /__fixtures__[/\\]pnpm-repo[/\\]node_modules[/\\]\.pnpm[/\\]github\.com\+facebook\+react-native@72e1eda0736d34d027e4d4b1c3cace529ab5dcf3_react@17\.0\.2[/\\]node_modules[/\\]react-native$/
    );
    expect(rnExclude.test(path.join(rnPath, "package.json"))).toBeFalsy();
  });

  test("exclusionList() ignores extra copies of react and react-native", () => {
    const repo = fixturePath("awesome-repo");
    const reactCopy = path.join(repo, "node_modules", "react", "package.json");
    const packageCopy = path.join(
      repo,
      "packages",
      "john",
      "node_modules",
      "react-native",
      "package.json"
    );
    const projectCopy = path.join(
      repo,
      "node_modules",
      "react-native",
      "package.json"
    );

    // Conan does not have a local copy of react-native. It should
    // exclude all but the repo's copy.
    setFixture("awesome-repo/packages/conan");
    const conanExclude = exclusionList();
    expect(conanExclude.test(reactCopy)).toBeFalsy();
    expect(conanExclude.test(packageCopy)).toBeTruthy();
    expect(conanExclude.test(projectCopy)).toBeFalsy();
    expect(
      conanExclude.test(
        path.join("conan", "windows", ".vs", "conan", "v16", "Browse.VC.db")
      )
    ).toBeTruthy();
    expect(conanExclude.test("Test.ProjectImports.zip")).toBeTruthy();

    // John has a local copy of react-native and should ignore all other copies.
    setFixture("awesome-repo/packages/john");
    const johnExclude = exclusionList();
    expect(johnExclude.test(reactCopy)).toBeFalsy();
    expect(johnExclude.test(packageCopy)).toBeFalsy();
    expect(johnExclude.test(projectCopy)).toBeTruthy();
    expect(
      johnExclude.test(
        path.join("john", "windows", ".vs", "conan", "v16", "Browse.VC.db")
      )
    ).toBeTruthy();
    expect(johnExclude.test("Test.ProjectImports.zip")).toBeTruthy();
  });

  test("exclusionList() returns additional exclusions", () => {
    const repo = fixturePath("awesome-repo");
    const reactCopy = path.join(repo, "node_modules", "react", "package.json");
    const packageCopy = path.join(
      repo,
      "packages",
      "john",
      "node_modules",
      "react-native",
      "package.json"
    );
    const projectCopy = path.join(
      repo,
      "node_modules",
      "react-native",
      "package.json"
    );

    setFixture("awesome-repo/packages/conan");
    const conanExclude = exclusionList([/.*[/\\]__fixtures__[/\\].*/]);
    expect(conanExclude.test(reactCopy)).toBeTruthy();
    expect(conanExclude.test(packageCopy)).toBeTruthy();
    expect(conanExclude.test(projectCopy)).toBeTruthy();
    expect(
      conanExclude.test(
        path.join("conan", "windows", ".vs", "conan", "v16", "Browse.VC.db")
      )
    ).toBeTruthy();
    expect(conanExclude.test("Test.ProjectImports.zip")).toBeTruthy();
  });
});

describe("makeMetroConfig", () => {
  const consoleWarnSpy = jest.spyOn(require("@rnx-kit/console"), "warn");

  const metroConfigKeys = [
    "cacheStores",
    "resolver",
    "serializer",
    "server",
    "symbolicator",
    "transformer",
    "watchFolders",
  ];

  afterEach(() => {
    consoleWarnSpy.mockReset();
  });

  test("returns a default Metro config", async () => {
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
    } else if (!config.server) {
      fail("Expected `config.server` to be defined");
    } else if (!config.transformer) {
      fail("Expected `config.transformer` to be defined");
    } else if (!config.transformer.getTransformOptions) {
      fail("Expected `config.transformer.getTransformOptions` to be defined");
    } else if (!Array.isArray(config.watchFolders)) {
      fail("Expected `config.watchFolders` to be an array");
    }

    expect(Object.keys(config.resolver.extraNodeModules)).toEqual(
      UNIQUE_PACKAGES
    );

    const blockList = exclusionList().source;
    expect(config.resolver.blacklistRE.source).toBe(blockList);
    expect(config.resolver.blockList.source).toBe(blockList);

    expect(config.server.enhanceMiddleware).toBe(enhanceMiddleware);
    expect(config.transformer.assetPlugins).toBeUndefined();

    const opts = { dev: false, hot: false };
    const transformerOptions = await config.transformer.getTransformOptions(
      [],
      opts,
      () => Promise.resolve([])
    );
    expect(transformerOptions?.transform).toEqual({
      experimentalImportSupport: false,
      inlineRequires: false,
    });

    expect(config.watchFolders.length).toBeGreaterThan(0);
  });

  test("merges Metro configs", async () => {
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
    } else if (!config.server) {
      fail("Expected `config.server` to be defined");
    } else if (!config.transformer) {
      fail("Expected `config.transformer` to be defined");
    } else if (!config.transformer.getTransformOptions) {
      fail("Expected `config.transformer.getTransformOptions` to be defined");
    } else if (!Array.isArray(config.watchFolders)) {
      fail("Expected `config.watchFolders` to be an array");
    }

    expect(Object.keys(config.resolver.extraNodeModules)).toEqual(
      UNIQUE_PACKAGES
    );

    const blockList = exclusionList().source;
    expect(config.resolver.blacklistRE.source).toBe(blockList);
    expect(config.resolver.blockList.source).toBe(blockList);

    expect(config.server.enhanceMiddleware).toBe(enhanceMiddleware);
    expect(config.transformer.assetPlugins).toBeUndefined();

    const opts = { dev: false, hot: false };
    const transformerOptions = await config.transformer.getTransformOptions(
      [],
      opts,
      () => Promise.resolve([])
    );
    expect(transformerOptions?.transform).toEqual({
      experimentalImportSupport: false,
      inlineRequires: false,
    });

    expect(config.watchFolders.length).toBeGreaterThan(0);
  });

  test("merges `extraNodeModules`", () => {
    const config = makeMetroConfig({
      projectRoot: __dirname,
      resolver: {
        extraNodeModules: {
          "my-awesome-package": "/skynet",
          "react-native": "/skynet",
        },
      },
    });

    const extraNodeModules = config.resolver?.extraNodeModules;
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

  test("sets both `blacklistRE` and `blockList`", () => {
    const configWithBlacklist = makeMetroConfig({
      resolver: {
        blacklistRE: /.*/,
      },
    });
    const blacklistRE = configWithBlacklist.resolver?.blacklistRE;

    expect(blacklistRE).not.toBeUndefined();
    expect(blacklistRE).toBe(configWithBlacklist.resolver?.blockList);

    const configWithBlockList = makeMetroConfig({
      resolver: {
        blockList: /.*/,
      },
    });
    const blockList = configWithBlockList.resolver?.blockList;

    expect(blockList).not.toBeUndefined();
    expect(blockList).toBe(configWithBlockList.resolver?.blacklistRE);
  });
});
