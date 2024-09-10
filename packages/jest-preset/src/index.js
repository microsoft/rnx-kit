const findUp = require("find-up");
const path = require("path");

/**
 * @typedef {import("@jest/types").Config.HasteConfig} HasteConfig
 * @typedef {import("@jest/types").Config.InitialOptions} InitialOptions
 * @typedef {import("@jest/types").Config.TransformerConfig} TransformerConfig
 * @typedef {import("@react-native-community/cli-types").Config} CLIConfig
 * @typedef {[string | undefined, string | undefined]} PlatformPath
 */

/**
 * Resolve the path to a dependency given a chain of dependencies leading up to
 * it.
 *
 * Note: This is a copy of the function in `@rnx-kit/tools-node` to avoid
 * circular dependency.
 *
 * @param {string[]} chain Chain of dependencies leading up to the target dependency.
 * @param {string=} startDir Optional starting directory for the search. If not given, the current directory is used.
 * @returns Path to the final dependency's directory.
 */
function resolveDependencyChain(chain, startDir = process.cwd()) {
  return chain.reduce((startDir, module) => {
    const p = require.resolve(`${module}/package.json`, { paths: [startDir] });
    return path.dirname(p);
  }, startDir);
}

/**
 * Returns the current package directory.
 * @returns {string | undefined}
 */
function getPackageDirectory() {
  const manifest = findUp.sync("package.json");
  return manifest ? path.dirname(manifest) : undefined;
}

/**
 * Returns a `[platform, path]` pair if the current package is an out-of-tree
 * platform package or is consuming one. Otherwise, `undefined` is returned.
 * @param {string=} rootDir
 * @returns {PlatformPath}
 */
function getReactNativePlatformPath(rootDir = getPackageDirectory()) {
  if (!rootDir) {
    throw new Error("Failed to resolve current package root");
  }

  const fs = require("fs");

  const rnConfigPath = path.join(rootDir, "react-native.config.js");
  if (!fs.existsSync(rnConfigPath)) {
    return [undefined, undefined];
  }

  const { platforms, reactNativePath } = require(rnConfigPath);
  if (reactNativePath) {
    const resolvedPath = /^\.?\.[/\\]/.test(reactNativePath)
      ? path.resolve(rootDir, reactNativePath)
      : path.dirname(
          require.resolve(`${reactNativePath}/package.json`, {
            paths: [rootDir],
          })
        );
    if (resolvedPath != rootDir) {
      return getReactNativePlatformPath(resolvedPath);
    }
  }

  if (platforms) {
    const names = Object.keys(platforms).filter(
      (name) => typeof platforms[name].npmPackageName === "string"
    );
    if (names.length > 1) {
      console.warn(`Multiple platforms found; picking the first one: ${names}`);
    }

    return [names[0], rootDir];
  }

  console.warn("No platforms found");
  return [undefined, undefined];
}

/**
 * Returns the platform name and path to the module providing the platform.
 * @param {string | undefined} defaultPlatform
 * @param {{ paths: string[] }} searchPaths
 * @returns {PlatformPath} `[platformName, platformPath]` pair
 */
function getTargetPlatform(defaultPlatform, searchPaths) {
  if (!defaultPlatform) {
    // If no target platform is set, see if we're inside an out-of-tree
    // platform package.
    return getReactNativePlatformPath();
  }

  /** @type {(config?: {projectRoot?: string; selectedPlatform?: string; }) => CLIConfig} */
  const loadConfig = (() => {
    const rnCliPath = resolveDependencyChain([
      "react-native",
      "@react-native-community/cli",
    ]);
    return (
      require(rnCliPath).loadConfig ||
      require(`${rnCliPath}/build/tools/config`).default
    );
  })();

  // .length on a function returns the number of formal parameters.
  // fixes https://github.com/react-native-community/cli/pull/2379 changing the number of parameters.
  const platforms =
    loadConfig.length == 1 ? loadConfig({}).platforms : loadConfig().platforms;

  const targetPlatformConfig = platforms[defaultPlatform];
  if (!targetPlatformConfig) {
    const availablePlatforms = Object.keys(platforms).join(", ");
    throw new Error(
      `'${defaultPlatform}' was not found among available platforms: ${availablePlatforms}`
    );
  }

  // `npmPackageName` is unset if target platform is in core.
  const { npmPackageName } = targetPlatformConfig;
  return [
    defaultPlatform,
    npmPackageName
      ? path.dirname(
          require.resolve(`${npmPackageName}/package.json`, searchPaths)
        )
      : undefined,
  ];
}

/**
 * Returns Babel presets for React Native.
 * @param {string | undefined} targetPlatform
 * @param {{ paths: string[] }} searchPaths
 * @returns {(string | TransformerConfig)[]}
 */
function babelPresets(targetPlatform, searchPaths) {
  if (!targetPlatform) {
    return [
      [require.resolve("@babel/preset-env"), { targets: { node: "current" } }],
      require.resolve("@babel/preset-typescript"),
    ];
  }

  try {
    // TODO: Remove `metro-react-native-babel-preset` branch when we drop
    // support for 0.72
    return [require.resolve("@react-native/babel-preset", searchPaths)];
  } catch (_) {
    return ["module:metro-react-native-babel-preset"];
  }
}

/**
 * Returns `haste` setup for React Native.
 * @param {string | undefined} defaultPlatform
 * @returns {HasteConfig | undefined}
 */
function haste(defaultPlatform) {
  return defaultPlatform
    ? {
        defaultPlatform,
        platforms:
          defaultPlatform === "win32" || defaultPlatform === "windows"
            ? [defaultPlatform, "win", "native"]
            : [defaultPlatform, "native"],
      }
    : undefined;
}

/**
 * Returns module name mappers for React Native.
 * @param {string | undefined} reactNativePlatformPath
 * @returns {Record<string, string | string[]> | undefined}
 */
function moduleNameMapper(reactNativePlatformPath) {
  return reactNativePlatformPath
    ? {
        "^react-native$": reactNativePlatformPath,
        "^react-native/(.*)": path.join(reactNativePlatformPath, "$1"),
      }
    : undefined;
}

/**
 * Returns setup files for React Native.
 * @param {string | undefined} targetPlatform
 * @param {string | undefined} reactNativePlatformPath
 * @param {{ paths: string[] }} searchPaths
 * @returns {string[] | undefined}
 */
function setupFiles(targetPlatform, reactNativePlatformPath, searchPaths) {
  return targetPlatform
    ? [
        require.resolve(
          `${reactNativePlatformPath || "react-native"}/jest/setup.js`,
          searchPaths
        ),
      ]
    : undefined;
}

/**
 * Returns test environment for React Native.
 * @param {string | undefined} targetPlatform
 * @param {string | undefined} reactNativePlatformPath
 * @param {{ paths: string[] }} searchPaths
 * @returns {string | undefined}
 */
function getTestEnvironment(
  targetPlatform,
  reactNativePlatformPath,
  searchPaths
) {
  if (targetPlatform) {
    try {
      return require.resolve(
        `${reactNativePlatformPath || "react-native"}/jest/react-native-env.js`,
        searchPaths
      );
    } catch (_) {
      // ignore
    }
  }
  return undefined;
}

/**
 * Returns transform rules for React Native.
 * @param {string | undefined} targetPlatform
 * @param {string | undefined} reactNativePlatformPath
 * @param {{ paths: string[] }} searchPaths
 * @returns {Record<string, string> | undefined}
 */
function transformRules(targetPlatform, reactNativePlatformPath, searchPaths) {
  const reactNative = reactNativePlatformPath || "react-native";
  return targetPlatform
    ? {
        "\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$": require.resolve(
          `${reactNative}/jest/assetFileTransformer.js`,
          searchPaths
        ),
      }
    : undefined;
}

/** @type {(defaultPlatform?: string, userOptions?: InitialOptions) => InitialOptions} */
module.exports = (
  defaultPlatform,
  {
    moduleNameMapper: userModuleNameMapper,
    transform: userTransform,
    transformIgnorePatterns: userTransformIgnorePatterns,
    ...userOptions
  } = {}
) => {
  const searchPaths = { paths: [process.cwd()] };
  const [targetPlatform, platformPath] = getTargetPlatform(
    defaultPlatform,
    searchPaths
  );
  const testEnvironment = getTestEnvironment(
    targetPlatform,
    platformPath,
    searchPaths
  );
  return {
    haste: haste(targetPlatform),
    moduleNameMapper: {
      ...moduleNameMapper(platformPath),
      ...userModuleNameMapper,
    },
    setupFiles: setupFiles(targetPlatform, platformPath, searchPaths),
    testEnvironment,
    transform: {
      "\\.[jt]sx?$": testEnvironment
        ? "babel-jest"
        : [
            "babel-jest",
            { presets: babelPresets(targetPlatform, searchPaths) },
          ],
      ...transformRules(targetPlatform, platformPath, searchPaths),
      ...userTransform,
    },
    transformIgnorePatterns: [
      "node_modules/(?!((jest-)?react-native(-macos)?|@react-native(-community)?|@office-iss/react-native-win32|@?react-native-windows)/)",
      ...(userTransformIgnorePatterns || []),
    ],
    ...userOptions,
  };
};
