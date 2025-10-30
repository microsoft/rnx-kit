import { deepEqual, equal, fail, match, ok, throws } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import { enhanceMiddleware } from "../src/assetPluginForMonorepos.js";
import metroConfigModule from "../src/index.js";

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
  const { defaultWatchFolders } = metroConfigModule;

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

describe("extractUniquePartsFromYarnStoreDir()", () => {
  const { extractUniquePartsFromYarnStoreDir } = metroConfigModule;

  it("returns version+hash from a versioned path", () => {
    const [pre, unique] = extractUniquePartsFromYarnStoreDir(
      "node_modules/.store/@babel-core-npm-7.27.1-0f1bf48e52"
    );

    equal(pre, "node_modules/.store/@babel-core-npm");
    equal(unique, "7.27.1-0f1bf48e52");
  });

  it("returns version+hash from a path with prerelease number", () => {
    const [pre, unique] = extractUniquePartsFromYarnStoreDir(
      "node_modules/.store/@react-native-assets-registry-npm-0.81.0-rc.5-d313abaf5e"
    );

    equal(pre, "node_modules/.store/@react-native-assets-registry-npm");
    equal(unique, "0.81.0-rc.5-d313abaf5e");
  });

  it("returns hash from a virtual path", () => {
    const [pre, unique] = extractUniquePartsFromYarnStoreDir(
      "node_modules/.store/react-native-virtual-3e97acc5aa"
    );

    equal(pre, "node_modules/.store/react-native-virtual");
    equal(unique, "3e97acc5aa");
  });
});

describe("resolveUniqueModule()", () => {
  const { resolveUniqueModule } = metroConfigModule;

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
  const { exclusionList } = metroConfigModule;

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
    ok(!conanExclude.some((regex) => regex.test(reactCopy)));
    ok(conanExclude.some((regex) => regex.test(packageCopy)));
    ok(!conanExclude.some((regex) => regex.test(projectCopy)));
    ok(
      conanExclude.some((regex) =>
        regex.test(
          path.join("conan", "windows", ".vs", "conan", "v16", "Browse.VC.db")
        )
      )
    );
    ok(conanExclude.some((regex) => regex.test("Test.ProjectImports.zip")));

    // John has a local copy of react-native and should ignore all other copies.
    setFixture("awesome-repo/packages/john");
    const johnExclude = exclusionList();
    ok(!johnExclude.some((regex) => regex.test(reactCopy)));
    ok(!johnExclude.some((regex) => regex.test(packageCopy)));
    ok(johnExclude.some((regex) => regex.test(projectCopy)));
    ok(
      johnExclude.some((regex) =>
        regex.test(
          path.join("john", "windows", ".vs", "john", "v16", "Browse.VC.db")
        )
      )
    );
    ok(johnExclude.some((regex) => regex.test("Test.ProjectImports.zip")));
  });

  it("ignores build files/folders", () => {
    setFixture("awesome-repo/packages/conan");

    const cases = [
      "project/.vs/output",
      "project/.vscode/output",
      "project/Pods/output",
      "project/__tests__/index.test.ts", // Default Metro exclusion
      "project/app.bundle/output",
      "project/app.noindex/output",
      "project/file.a",
      "project/file.apk",
      "project/file.appx",
      "project/file.bak",
      "project/file.bat",
      "project/file.binlog",
      "project/file.c",
      "project/file.cache",
      "project/file.cc",
      "project/file.class",
      "project/file.cpp",
      "project/file.cs",
      "project/file.dex",
      "project/file.dll",
      "project/file.env",
      "project/file.exe",
      "project/file.flat",
      "project/file.tar.gz",
      "project/file.h",
      "project/file.hpp",
      "project/file.jar",
      "project/file.lock",
      "project/file.m",
      "project/file.mm",
      "project/file.modulemap",
      "project/file.o",
      "project/file.obj",
      "project/file.pbxproj",
      "project/file.pch",
      "project/file.pdb",
      "project/file.plist",
      "project/file.sh",
      "project/file.so",
      "project/file.tflite",
      "project/file.tgz",
      "project/file.tlog",
      "project/file.wrn",
      "project/file.xcconfig",
      "project/file.xcscheme",
      "project/file.xcworkspacedata",
      "project/file.zip",
    ];
    const exclusions = exclusionList();

    for (const path of cases) {
      ok(exclusions.some((regex) => regex.test(path)));
    }
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
    ok(conanExclude.some((regex) => regex.test(reactCopy)));
    ok(conanExclude.some((regex) => regex.test(packageCopy)));
    ok(conanExclude.some((regex) => regex.test(projectCopy)));
    ok(
      conanExclude.some((regex) =>
        regex.test(
          path.join("conan", "windows", ".vs", "conan", "v16", "Browse.VC.db")
        )
      )
    );
    ok(conanExclude.some((regex) => regex.test("Test.ProjectImports.zip")));
  });
});

describe("makeMetroConfig()", () => {
  const { exclusionList, makeMetroConfig } = metroConfigModule;

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
    } else if (!Array.isArray(config.resolver.blacklistRE)) {
      fail("Expected `config.resolver.blacklistRE` to be a RegExp array");
    } else if (!Array.isArray(config.resolver.blockList)) {
      fail("Expected `config.resolver.blockList` to be a RegExp array");
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
      "@babel/runtime",
    ]);

    const blockList = exclusionList([], projectRoot);
    deepEqual(config.resolver.blacklistRE, blockList);
    deepEqual(config.resolver.blockList, blockList);

    equal(config.server.enhanceMiddleware, enhanceMiddleware);
    deepEqual(config.transformer.assetPlugins, []);

    const opts = { dev: false, hot: true, platform: undefined } as const;
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
    } else if (!Array.isArray(config.resolver.blacklistRE)) {
      fail("Expected `config.resolver.blacklistRE` to be a RegExp array");
    } else if (!Array.isArray(config.resolver.blockList)) {
      fail("Expected `config.resolver.blockList` to be a RegExp array");
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
      "@babel/runtime",
    ]);

    const blockList = exclusionList([], projectRoot);
    deepEqual(config.resolver.blacklistRE, blockList);
    deepEqual(config.resolver.blockList, blockList);

    equal(config.server.enhanceMiddleware, enhanceMiddleware);
    deepEqual(config.transformer.assetPlugins, []);

    const opts = { dev: false, hot: true, platform: undefined } as const;
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
