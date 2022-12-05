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
 * @returns {PlatformPath} `[platformName, platformPath]` pair
 */
function getTargetPlatform(defaultPlatform) {
  if (!defaultPlatform) {
    // If no target platform is set, see if we're inside an out-of-tree
    // platform package.
    return getReactNativePlatformPath();
  }

  /** @type {() => CLIConfig} */
  const loadConfig =
    // @ts-ignore could not find a declaration file
    require("@react-native-community/cli").loadConfig ||
    // @ts-ignore could not find a declaration file
    require("@react-native-community/cli/build/tools/config").default;

  const { platforms } = loadConfig();
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
          require.resolve(`${npmPackageName}/package.json`, {
            paths: [process.cwd()],
          })
        )
      : undefined,
  ];
}

/**
 * Returns Babel presets for React Native.
 * @param {string | undefined} targetPlatform
 * @returns {(string | TransformerConfig)[]}
 */
function babelPresets(targetPlatform) {
  return targetPlatform
    ? ["module:metro-react-native-babel-preset"]
    : [
        ["@babel/preset-env", { targets: { node: "current" } }],
        "@babel/preset-typescript",
      ];
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
 * @returns {string[] | undefined}
 */
function setupFiles(targetPlatform, reactNativePlatformPath) {
  return targetPlatform
    ? [
        require.resolve(
          `${reactNativePlatformPath || "react-native"}/jest/setup`
        ),
      ]
    : undefined;
}

/**
 * Returns transform rules for React Native.
 * @param {string | undefined} targetPlatform
 * @param {string | undefined} reactNativePlatformPath
 * @returns {Record<string, string> | undefined}
 */
function transformRules(targetPlatform, reactNativePlatformPath) {
  const reactNative = reactNativePlatformPath || "react-native";
  return targetPlatform
    ? {
        "\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$": require.resolve(
          `${reactNative}/jest/assetFileTransformer.js`
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
  const [targetPlatform, platformPath] = getTargetPlatform(defaultPlatform);
  return {
    haste: haste(targetPlatform),
    moduleNameMapper: {
      ...moduleNameMapper(platformPath),
      ...userModuleNameMapper,
    },
    setupFiles: setupFiles(targetPlatform, platformPath),
    transform: {
      "\\.[jt]sx?$": ["babel-jest", { presets: babelPresets(targetPlatform) }],
      ...transformRules(targetPlatform, platformPath),
      ...userTransform,
    },
    transformIgnorePatterns: [
      "node_modules/(?!((jest-)?react-native(-macos)?|@react-native(-community)?|@office-iss/react-native-win32|@?react-native-windows)/)",
      ...(userTransformIgnorePatterns || []),
    ],
    ...userOptions,
  };
};
