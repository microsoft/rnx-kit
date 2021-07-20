import fs from "fs";
import path from "path";
import pkgDir from "pkg-dir";
import { Opts, sync as resolveSync } from "resolve";

type PlatformPath = [string, string];

/**
 * Returns a `[platform, path]` pair if the current package is an out-of-tree
 * platform package or is consuming one. Otherwise, `undefined` is returned.
 */
function getReactNativePlatformPath(
  rootDir = pkgDir.sync()
): PlatformPath | undefined {
  if (!rootDir) {
    throw new Error("Failed to resolve current package root");
  }

  const rnConfigPath = path.join(rootDir, "react-native.config.js");
  if (!fs.existsSync(rnConfigPath)) {
    return undefined;
  }

  const { platforms, reactNativePath } = require(rnConfigPath);
  if (reactNativePath) {
    const resolvedPath = /^\.?\.[/\\]/.test(reactNativePath)
      ? path.resolve(rootDir, reactNativePath)
      : path.dirname(require.resolve(`${reactNativePath}/package.json`));
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
  return undefined;
}

function getTargetPlatform(): PlatformPath | undefined {
  // TODO: Figure out the mechanism for providing a target platform.
  const targetPlatform = process.env["RN_TARGET_PLATFORM"];
  if (!targetPlatform) {
    // If no target platform is set, see if we're inside an out-of-tree
    // platform package.
    return getReactNativePlatformPath();
  }

  const loadConfig = require("@react-native-community/cli/build/tools/config");
  const { platforms } = loadConfig();
  const targetPlatformConfig = platforms[targetPlatform];
  if (!targetPlatformConfig) {
    const availablePlatforms = Object.keys(platforms).join(", ");
    throw new Error(
      `'${targetPlatform}' was not found among available platforms: ${availablePlatforms}`
    );
  }

  return [targetPlatform, targetPlatformConfig.npmPackageName];
}

function makePathFilter(): Opts["pathFilter"] {
  const targetPlatform = getTargetPlatform();
  if (!targetPlatform) {
    return (_pkg, _path, relativePath) => relativePath;
  }

  const [_, platformPath] = targetPlatform;
  const reactNativePath = path.dirname(
    require.resolve("react-native/package.json")
  );
  return (pkg, _path, relativePath) => {
    if (pkg.name === "react-native") {
      return path.relative(
        reactNativePath,
        path.join(platformPath, relativePath)
      );
    } else {
      return relativePath;
    }
  };
}

const pathFilter = makePathFilter();

module.exports = (request: string, options: Opts) => {
  return resolveSync(request, {
    ...options,
    preserveSymlinks: false,
    pathFilter,
  });
};
