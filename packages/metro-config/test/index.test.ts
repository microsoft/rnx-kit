import { deepEqual, equal, match, ok, throws } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import { enhanceMiddleware } from "../src/assetPluginForMonorepos";
import {
  defaultWatchFolders,
  exclusionList,
  makeMetroConfig,
  resolveUniqueModule,
} from "../src/index";

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

describe("defaultWatchFolders()", () => {
  afterEach(() => process.chdir(currentWorkingDir));

  it("returns an empty list outside a monorepo", () => {
    setFixture("app-repo");
    equal(defaultWatchFolders().length, 0);
  });

  it("returns packages in a monorepo", () => {
    setFixture("awesome-repo/packages/t-800");

    const expected = [
      /__fixtures__[/\\]awesome-repo[/\\]node_modules$/,
      /__fixtures__[/\\]awesome-repo[/\\]packages[/\\]conan$/,
      /__fixtures__[/\\]awesome-repo[/\\]packages[/\\]dutch$/,
      /__fixtures__[/\\]awesome-repo[/\\]packages[/\\]john$/,
      /__fixtures__[/\\]awesome-repo[/\\]packages[/\\]quaid$/,
      /__fixtures__[/\\]awesome-repo[/\\]packages[/\\]t-800$/,
    ];
    const folders = defaultWatchFolders()
      .map((path) => path.replaceAll("\\", "/"))
      .sort();

    for (let i = 0; i < folders.length; ++i) {
      match(folders[i], expected[i]);
    }
  });
});

describe("resolveUniqueModule()", () => {
  afterEach(() => process.chdir(currentWorkingDir));

  it("ignores symlinks", () => {
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

    ok(fs.lstatSync("node_modules/react-native").isSymbolicLink());

    const [reactNativePath, exclude] = resolveUniqueModule("react-native");
    equal(reactNativePath, path.dirname(projectCopy));
    ok(exclude.test(packageCopy));
    ok(!exclude.test(projectCopy));
  });

  it("handles nested dependencies", () => {
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
    equal(reactNativePath, path.dirname(packageRnCopy));
    ok(!excludeReactNative.test(packageRnCopy));
    ok(excludeReactNative.test(projectRnCopy));

    const [matrixPath, excludeMatrix] = resolveUniqueModule("@commando/matrix");
    equal(matrixPath, path.dirname(packageMatrixCopy));
    ok(!excludeMatrix.test(packageMatrixCopy));
    ok(excludeMatrix.test(projectMatrixCopy));
  });

  it("throws if a package is not found", () => {
    ok(resolveUniqueModule("eslint", process.cwd()));

    const packageName = "this-package-does-not-exist";
    throws(
      () => resolveUniqueModule(packageName, process.cwd()),
      new Error(`Cannot find module '${packageName}'`)
    );
  });

  it("escapes characters clashing with regex tokens", () => {
    const repo = fixturePath("pnpm-repo");
    const [rnPath, rnExclude] = resolveUniqueModule("react-native", repo);
    match(
      rnPath,
      /__fixtures__[/\\]pnpm-repo[/\\]node_modules[/\\]\.pnpm[/\\]github\.com\+facebook\+react-native@72e1eda0736d34d027e4d4b1c3cace529ab5dcf3_react@17\.0\.2[/\\]node_modules[/\\]react-native$/
    );
    ok(!rnExclude.test(path.join(rnPath, "package.json")));
  });

  it("supports Yarn's pnpm layout", () => {
    const repo = fixturePath("yarn-pnpm-repo");

    const packages = [
      [
        "@babel/core",
        /__fixtures__[/\\]yarn-pnpm-repo[/\\]node_modules[/\\]\.store[/\\]@babel-core-npm-7.27.1-0f1bf48e52[/\\]package$/,
      ],
      [
        "react-native",
        /__fixtures__[/\\]yarn-pnpm-repo[/\\]node_modules[/\\]\.store[/\\]react-native-virtual-3e97acc5aa[/\\]package$/,
      ],
    ] as const;

    for (const [pkgName, pattern] of packages) {
      const [pkgDir, excludePattern] = resolveUniqueModule(pkgName, repo);
      match(pkgDir, pattern);
      ok(!excludePattern.test(path.join(pkgDir, "package.json")));
    }
  });
});

describe("exclusionList()", () => {
  afterEach(() => process.chdir(currentWorkingDir));

  it("ignores extra copies of react and react-native", () => {
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
    ok(!conanExclude.test(reactCopy));
    ok(conanExclude.test(packageCopy));
    ok(!conanExclude.test(projectCopy));
    ok(
      conanExclude.test(
        path.join("conan", "windows", ".vs", "conan", "v16", "Browse.VC.db")
      )
    );
    ok(conanExclude.test("Test.ProjectImports.zip"));

    // John has a local copy of react-native and should ignore all other copies.
    setFixture("awesome-repo/packages/john");
    const johnExclude = exclusionList();
    ok(!johnExclude.test(reactCopy));
    ok(!johnExclude.test(packageCopy));
    ok(johnExclude.test(projectCopy));
    ok(
      johnExclude.test(
        path.join("john", "windows", ".vs", "conan", "v16", "Browse.VC.db")
      )
    );
    ok(johnExclude.test("Test.ProjectImports.zip"));
  });

  it("returns additional exclusions", () => {
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
    ok(conanExclude.test(reactCopy));
    ok(conanExclude.test(packageCopy));
    ok(conanExclude.test(projectCopy));
    ok(
      conanExclude.test(
        path.join("conan", "windows", ".vs", "conan", "v16", "Browse.VC.db")
      )
    );
    ok(conanExclude.test("Test.ProjectImports.zip"));
  });
});

describe("makeMetroConfig()", () => {
  const projectRoot = path.resolve("../test-app");

  it("returns a default Metro config", async () => {
    const config = makeMetroConfig({ projectRoot });

    deepEqual(Object.keys(config).sort(), [
      "cacheStores",
      "cacheVersion",
      "maxWorkers",
      "projectRoot",
      "reporter",
      "resetCache",
      "resolver",
      "serializer",
      "server",
      "stickyWorkers",
      "symbolicator",
      "transformer",
      "transformerPath",
      "unstable_perfLoggerFactory",
      "watchFolders",
      "watcher",
    ]);

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

    deepEqual(Object.keys(config.resolver.extraNodeModules), [
      "react",
      "react-native",
      "react-native-windows",
      "@babel/runtime",
    ]);

    const blockList = exclusionList([], projectRoot).source;
    equal(config.resolver.blacklistRE.source, blockList);
    equal(config.resolver.blockList.source, blockList);

    equal(config.server.enhanceMiddleware, enhanceMiddleware);
    deepEqual(config.transformer.assetPlugins, []);

    const opts = { dev: false, hot: false };
    const transformerOptions = await config.transformer.getTransformOptions(
      [],
      opts,
      () => Promise.resolve([])
    );
    deepEqual(transformerOptions?.transform, {
      experimentalImportSupport: false,
      inlineRequires: false,
    });

    ok(config.watchFolders.length > 0);
  });

  it("merges Metro configs", async () => {
    const config = makeMetroConfig({
      projectRoot,
      resetCache: true,
    });

    deepEqual(Object.keys(config).sort(), [
      "cacheStores",
      "cacheVersion",
      "maxWorkers",
      "projectRoot",
      "reporter",
      "resetCache",
      "resolver",
      "serializer",
      "server",
      "stickyWorkers",
      "symbolicator",
      "transformer",
      "transformerPath",
      "unstable_perfLoggerFactory",
      "watchFolders",
      "watcher",
    ]);

    equal(config.projectRoot, projectRoot);
    ok(config.resetCache);

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

    deepEqual(Object.keys(config.resolver.extraNodeModules), [
      "react",
      "react-native",
      "react-native-windows",
      "@babel/runtime",
    ]);

    const blockList = exclusionList([], projectRoot).source;
    equal(config.resolver.blacklistRE.source, blockList);
    equal(config.resolver.blockList.source, blockList);

    equal(config.server.enhanceMiddleware, enhanceMiddleware);
    deepEqual(config.transformer.assetPlugins, []);

    const opts = { dev: false, hot: false };
    const transformerOptions = await config.transformer.getTransformOptions(
      [],
      opts,
      () => Promise.resolve([])
    );
    deepEqual(transformerOptions?.transform, {
      experimentalImportSupport: false,
      inlineRequires: false,
    });

    ok(config.watchFolders.length > 0);
  });

  it("merges `extraNodeModules`", () => {
    const config = makeMetroConfig({
      projectRoot,
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

    deepEqual(Object.keys(extraNodeModules).sort(), [
      "@babel/runtime",
      "my-awesome-package",
      "react",
      "react-native",
      "react-native-windows",
    ]);

    equal(extraNodeModules["my-awesome-package"], "/skynet");
    equal(extraNodeModules["react-native"], "/skynet");
  });

  it("sets both `blacklistRE` and `blockList`", () => {
    const configWithBlacklist = makeMetroConfig({
      projectRoot,
      resolver: {
        blacklistRE: /.*/,
      },
    });
    const blacklistRE = configWithBlacklist.resolver?.blacklistRE;

    ok(blacklistRE);
    equal(blacklistRE, configWithBlacklist.resolver?.blockList);

    const configWithBlockList = makeMetroConfig({
      projectRoot,
      resolver: {
        blockList: /.*/,
      },
    });
    const blockList = configWithBlockList.resolver?.blockList;

    ok(blockList);
    equal(blockList, configWithBlockList.resolver?.blacklistRE);
  });
});
