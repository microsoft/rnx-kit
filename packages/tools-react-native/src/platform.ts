/**
 * List of supported react-native platforms.
 */
export type AllPlatforms = "ios" | "android" | "windows" | "win32" | "macos";

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
