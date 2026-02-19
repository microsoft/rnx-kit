/**
 * List of supported react-native platforms.
 */

// Possible values for AllPlatforms
// eslint-disable-next-line @rnx-kit/type-definitions-only
export const ALL_PLATFORM_VALUES = [
  "android",
  "ios",
  "macos",
  "visionos",
  "web",
  "win32",
  "windows",
] as const;

export type AllPlatforms = (typeof ALL_PLATFORM_VALUES)[number];
