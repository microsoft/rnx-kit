import type { ResolverLog } from "./log";

/**
 * Get the name of an out-of-tree platform's react-native package.
 *
 * @param platform Platform
 * @returns Name of the out-of-tree platform's react-native package, or `undefined` if it is in-tree or unknown.
 */
export function getReactNativePlatformPackageName(
  platform: string
): string | undefined {
  switch (platform) {
    case "windows":
      return "react-native-windows";
    case "macos":
      return "react-native-macos";
    case "win32":
      return "@office-iss/react-native-win32";
  }
  return undefined;
}

const DEFAULT_PACKAGE_NAME = "react-native";

/**
 * Create a function that replaces a 'react-native' module reference with
 * a reference to the target platform's react-native package. This only
 * happens when targeting an out-of-tree platform like Windows or MacOS.
 *
 * @param platform Target platform
 * @param disableReactNativePackageSubstitution Flag controling whether or not the returned function has an effect
 * @param log Resolver log
 * @returns Function which replaces a 'react-native' module reference, or a function which has no effect if module replacement is not needed or disabled
 */
export function createReactNativePackageNameReplacer(
  platform: string,
  disableReactNativePackageSubstitution: boolean,
  log: ResolverLog
): (m: string) => string {
  const platformPackageName = getReactNativePlatformPackageName(platform);
  if (!platformPackageName || disableReactNativePackageSubstitution) {
    return (m: string) => m;
  }

  return (m: string): string => {
    if (!m.startsWith(DEFAULT_PACKAGE_NAME)) {
      return m;
    }

    const replaced =
      platformPackageName + m.substring(DEFAULT_PACKAGE_NAME.length);
    log.log("Substituting module '%s' with '%s'.", m, replaced);
    return replaced;
  };
}
