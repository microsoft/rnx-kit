import { getAvailablePlatforms } from "@rnx-kit/tools-react-native";

const DEFAULT_PACKAGE_NAME = "react-native";

/**
 * Create a function that replaces a 'react-native' module reference with
 * a reference to the target platform's react-native package. This only
 * happens when targeting an out-of-tree platform like Windows or MacOS.
 *
 * @param currentDirectory Current directory - used to find available React Native platforms
 * @param platform Target platform
 * @param disableReactNativePackageSubstitution Flag controling whether or not the returned function has an effect
 * @returns Function which replaces a 'react-native' module reference, or a function which has no effect if module replacement is not needed or disabled
 */
export function createReactNativePackageNameReplacer(
  currentDirectory: string,
  platform: string,
  disableReactNativePackageSubstitution: boolean
): (m: string) => string {
  const platformPackageName = getAvailablePlatforms(currentDirectory)[platform];
  if (!platformPackageName || disableReactNativePackageSubstitution) {
    return (m: string) => m;
  }

  return (m: string): string => {
    if (!m.startsWith(DEFAULT_PACKAGE_NAME)) {
      return m;
    }

    const replaced =
      platformPackageName + m.substring(DEFAULT_PACKAGE_NAME.length);
    return replaced;
  };
}
