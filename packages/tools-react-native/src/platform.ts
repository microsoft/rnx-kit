/**
 * List of supported react-native platforms.
 */
export type AllPlatforms = "ios" | "android" | "windows" | "win32" | "macos";

// TODO: `react-native config` is too slow. Hard-coding this list until we can
// figure out a better solution.
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
