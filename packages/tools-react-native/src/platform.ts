import * as fs from "fs";
import * as path from "path";

/**
 * List of supported react-native platforms.
 */
export type AllPlatforms = "ios" | "android" | "windows" | "win32" | "macos";

// TODO: `react-native config` is too slow. Hard-coding this list until we can
// figure out a better solution.
// See https://github.com/microsoft/rnx-kit/issues/925
export const AVAILABLE_PLATFORMS: Record<string, string> = {
  macos: "react-native-macos",
  win32: "@office-iss/react-native-win32",
  windows: "react-native-windows",
};

/**
 * Returns a list of extensions that should be tried for the target platform in
 * prioritized order.
 * @param platform The platform to expand platform extensions for
 * @param extensions A list of extensions to expand
 * @returns A list of extensions
 */
export function expandPlatformExtensions(
  platform: string,
  extensions: string[]
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
 * Returns a map of available React Native platforms.
 */
export function getAvailablePlatforms(
  packageRoot = process.cwd(),
  platformMap: Record<string, string> = { android: "", ios: "" }
): Record<string, string> {
  const packageJson = path.join(packageRoot, "package.json");
  if (!fs.existsSync(packageJson)) {
    const parent = path.dirname(packageRoot);
    return parent === packageRoot
      ? platformMap
      : getAvailablePlatforms(path.dirname(packageRoot), platformMap);
  }

  const resolveOptions = { paths: [packageRoot] };
  const { dependencies, devDependencies } = require(packageJson);
  [
    ...(dependencies ? Object.keys(dependencies) : []),
    ...(devDependencies ? Object.keys(devDependencies) : []),
  ].forEach((pkgName) => {
    if (!pkgName.startsWith("react-native-")) {
      return;
    }

    const pkgPath = path.dirname(
      require.resolve(`${pkgName}/package.json`, resolveOptions)
    );

    const configPath = path.join(pkgPath, "react-native.config.js");
    if (fs.existsSync(configPath)) {
      const { platforms } = require(configPath);
      if (platforms) {
        Object.keys(platforms).forEach((platform) => {
          if (typeof platformMap[platform] === "undefined") {
            const { npmPackageName } = platforms[platform];
            if (npmPackageName) {
              platformMap[platform] = npmPackageName;
            }
          }
        });
      }
    }
  });

  return platformMap;
}

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
