import loadConfig from "@react-native-community/cli/build/tools/config";
import fs from "fs";
import { defaults } from "jest-config";
import path from "path";
import pkgDir from "pkg-dir";
import { Opts, sync as resolveSync } from "resolve";

type PathFilter = Opts["pathFilter"];
type PlatformPath = [string | undefined, string | undefined];

/**
 * Returns all extensions to look for when resolving modules for specified
 * target platform.
 * @param targetPlatform The target platform
 * @returns List of extensions; `undefined` if `moduleFileExtensions` is empty.
 */
function getPlatformExtensions(
  targetPlatform: string | undefined
): string[] | undefined {
  if (!targetPlatform) {
    return undefined;
  }

  // TODO: Should probably read Jest config
  // https://github.com/microsoft/rnx-kit/issues/424
  const { moduleFileExtensions } = defaults;
  if (!moduleFileExtensions || moduleFileExtensions.length === 0) {
    return undefined;
  }

  return [
    ...moduleFileExtensions.map((ext) => `.${targetPlatform}.${ext}`),
    ...(targetPlatform === "win32" || targetPlatform === "windows"
      ? moduleFileExtensions.map((ext) => `.win.${ext}`)
      : []),
    ...moduleFileExtensions.map((ext) => `.native.${ext}`),
    ...moduleFileExtensions.map((ext) => `.${ext}`),
  ];
}

/**
 * Returns a `[platform, path]` pair if the current package is an out-of-tree
 * platform package or is consuming one. Otherwise, `undefined` is returned.
 */
function getReactNativePlatformPath(rootDir = pkgDir.sync()): PlatformPath {
  if (!rootDir) {
    throw new Error("Failed to resolve current package root");
  }

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

  console.warn("No platforms found; picking a random one");
  return [undefined, undefined];
}

/**
 * Returns the platform name and path to the module providing the platform.
 * @returns `[platformName, platformPath]` pair
 */
function getTargetPlatform(): PlatformPath {
  // TODO: Figure out the mechanism for providing a target platform.
  // https://github.com/microsoft/rnx-kit/issues/425
  const targetPlatform = process.env["RN_TARGET_PLATFORM"];
  if (!targetPlatform) {
    // If no target platform is set, see if we're inside an out-of-tree
    // platform package.
    return getReactNativePlatformPath();
  }

  const { platforms } = loadConfig();
  const targetPlatformConfig = platforms[targetPlatform];
  if (!targetPlatformConfig) {
    const availablePlatforms = Object.keys(platforms).join(", ");
    throw new Error(
      `'${targetPlatform}' was not found among available platforms: ${availablePlatforms}`
    );
  }

  // `npmPackageName` is unset if target platform is in core.
  const { npmPackageName } = targetPlatformConfig;
  return [
    targetPlatform,
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
 * Returns the list of file extensions Jest should use to resolve modules, and
 * a path filter for mapping `react-native` to the correct path.
 * @returns `[extensions, pathFilter]` pair
 */
function initialize(): [string[] | undefined, PathFilter] {
  const defaultPathFilter: PathFilter = (_pkg, _path, relativePath) =>
    relativePath;

  const [platformName, platformPath] = getTargetPlatform();
  const reactNativePath = path.dirname(
    require.resolve("react-native/package.json", { paths: [process.cwd()] })
  );
  return [
    getPlatformExtensions(platformName),
    platformPath
      ? (pkg, _path, relativePath) => {
          if (pkg.name === "react-native") {
            return path.relative(
              reactNativePath,
              path.join(platformPath, relativePath)
            );
          } else {
            return relativePath;
          }
        }
      : defaultPathFilter,
  ];
}

const [extensions, pathFilter] = initialize();

module.exports = (request: string, options: Opts) => {
  return resolveSync(request, {
    ...options,
    extensions: extensions ?? options.extensions,
    pathFilter,
    preserveSymlinks: false,
  });
};
