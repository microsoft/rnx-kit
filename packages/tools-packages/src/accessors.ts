import type { GetPackageValue, PackageInfo } from "./types";

/**
 * Helper function to create a typed accessor function for getting and storing information
 * in PackageInfo. This can be whatever you want, the key is only created and stored in
 * the generated function so there are no collisions.
 *
 * @param friendlyName name used to create a symbol key for the package info
 * @param initialize function used to initialize the value stored in the key
 * @returns a function to retrieve the value from the package info, if unset the initialize function is called
 */
export function createPackageValueLoader<T>(
  friendlyName: string,
  initialize: (pkgInfo: PackageInfo) => T
): GetPackageValue<T> {
  const symbolKey = Symbol(friendlyName);
  return (pkgInfo: PackageInfo) => {
    if (!(symbolKey in pkgInfo)) {
      pkgInfo[symbolKey] = initialize(pkgInfo);
    }
    return pkgInfo[symbolKey] as T;
  };
}

/**
 * Create has/get/set accessors for a newly created symbol key that can look up values in PackageInfo
 *
 * @param friendlyName name used to create a symbol key for the package info
 * @returns a set of accessors for the symbol key
 */
export function createPackageValueAccessors<T>(friendlyName: string) {
  const symbolKey = Symbol(friendlyName);
  return {
    has(pkgInfo: PackageInfo) {
      return symbolKey in pkgInfo;
    },
    get(pkgInfo: PackageInfo) {
      return pkgInfo[symbolKey] as T;
    },
    set(pkgInfo: PackageInfo, value: T) {
      pkgInfo[symbolKey] = value;
    },
  };
}
