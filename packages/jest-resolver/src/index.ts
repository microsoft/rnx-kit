import fs from "fs";
import path from "path";
import pkgDir from "pkg-dir";
import { Opts, sync as resolveSync } from "resolve";

function getReactNativePlatformPath(): string | undefined {
  const rootDir = pkgDir.sync();
  if (!rootDir) {
    throw new Error("Failed to resolve current package root");
  }

  const rnConfigPath = path.join(rootDir, "react-native.config.js");
  if (!fs.existsSync(rnConfigPath)) {
    return undefined;
  }

  const { platforms, reactNativePath } = require(rnConfigPath);
  if (reactNativePath) {
    return /^\.?\.[/\\]/.test(reactNativePath)
      ? path.resolve(rootDir, reactNativePath)
      : path.dirname(require.resolve(`${reactNativePath}/package.json`));
  }

  if (platforms) {
    const names = Object.keys(platforms).filter(
      (name) => typeof platforms[name].npmPackageName === "string"
    );
    if (names.length > 1) {
      console.warn(`Multiple platforms found; picking the first one: ${names}`);
    }

    const { npmPackageName } = platforms[names[0]];
    const resolvedPath = require.resolve(`${npmPackageName}/package.json`);
    return path.dirname(resolvedPath);
  }

  return undefined;
}

function getReactNativePath(): string | undefined {
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

  return targetPlatformConfig.npmPackageName;
}

function makePathFilter(): Opts["pathFilter"] {
  const platformPath = getReactNativePath();
  if (!platformPath) {
    return (_pkg, _path, relativePath) => relativePath;
  }

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
