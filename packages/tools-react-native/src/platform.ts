import { findPackageDependencyDir } from "@rnx-kit/tools-node/package";
import * as fs from "node:fs";
import * as path from "node:path";
import { readReactNativeConfig } from "./context";

/**
 * List of supported react-native platforms.
 */
export type AllPlatforms = "android" | "ios" | "macos" | "win32" | "windows";

/**
 * Returns a list of extensions that should be tried for the target platform in
 * prioritized order.
 * @param platform The platform to expand platform extensions for
 * @param extensions A list of extensions to expand
 * @returns A list of extensions
 */
export function expandPlatformExtensions(
  platform: string,
  extensions: readonly string[]
): string[] {
  const platforms = platformExtensions(platform);

  const expanded = platforms.reduce<string[]>((expanded, platform) => {
    expanded.push(...extensions.map((ext) => `.${platform}${ext}`));
    return expanded;
  }, []);

  expanded.push(...extensions);
  return expanded;
}

/**
 * Returns a map of available React Native platforms. The result is NOT cached.
 * @param startDir The directory to look for react-native platforms from
 * @param platformMap A platform-to-npm-package map of known packages
 * @returns A platform-to-npm-package map, excluding "core" platforms.
 */
export function getAvailablePlatformsUncached(
  startDir = process.cwd(),
  platformMap: Record<string, string> = { android: "", ios: "" }
): typeof platformMap {
  const packageJson = path.join(startDir, "package.json");
  if (!fs.existsSync(packageJson)) {
    const parent = path.dirname(startDir);
    return parent === startDir
      ? platformMap
      : getAvailablePlatformsUncached(path.dirname(startDir), platformMap);
  }

  const { dependencies, peerDependencies, devDependencies } = JSON.parse(
    fs.readFileSync(packageJson, { encoding: "utf-8" })
  );

  const packages = new Set<string>(
    dependencies ? Object.keys(dependencies) : []
  );
  for (const deps of [peerDependencies, devDependencies]) {
    if (deps) {
      for (const pkg of Object.keys(deps)) {
        packages.add(pkg);
      }
    }
  }

  const recordPlatformPackage = (pkgPath: string | undefined) => {
    if (!pkgPath) {
      return;
    }

    const manifest = readReactNativeConfig(pkgPath, startDir);
    if (!manifest) {
      return;
    }

    const { platforms } = manifest;
    if (!platforms || typeof platforms !== "object") {
      return;
    }

    for (const [platform, info] of Object.entries(platforms)) {
      if (typeof platformMap[platform] === "undefined") {
        const { npmPackageName } = info;
        if (npmPackageName) {
          platformMap[platform] = npmPackageName;
        }
      }
    }
  };

  recordPlatformPackage(startDir);

  const options = { startDir };
  packages.forEach((pkgName) => {
    const pkgPath = findPackageDependencyDir(pkgName, options);
    if (pkgPath) {
      recordPlatformPackage(pkgPath);
    }
  });

  return platformMap;
}

/**
 * Returns a map of available React Native platforms. The result is cached.
 * @param startDir The directory to look for react-native platforms from
 * @returns A platform-to-npm-package map, excluding "core" platforms.
 */
export const getAvailablePlatforms = (() => {
  const isTesting =
    Boolean(process.env.NODE_TEST_CONTEXT) || process.env.NODE_ENV === "test";

  let platformMap: Record<string, string> | undefined = undefined;
  return (startDir = process.cwd()) => {
    if (!platformMap || isTesting) {
      platformMap = getAvailablePlatformsUncached(startDir);
    }
    return platformMap;
  };
})();

/**
 * Returns file extensions that can be mapped to the target platform.
 * @param platform The platform to retrieve extensions for
 * @returns Valid extensions for specified platform
 */
export function platformExtensions(platform: string): string[] {
  switch (platform) {
    case "win32":
    case "windows":
      return [platform, "win", "native"];
    default:
      return [platform, "native"];
  }
}

/**
 * Parse a string to ensure it maps to a valid react-native platform.
 *
 * @param val Input string
 * @returns React-native platform name. Throws `Error` on failure.
 */
export function parsePlatform(val: string): AllPlatforms {
  switch (val) {
    case "android":
    case "ios":
    case "macos":
    case "win32":
    case "windows":
      return val;

    default:
      throw new Error("Invalid platform '" + val + "'");
  }
}
