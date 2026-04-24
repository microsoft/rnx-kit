import type {
  GetPackageValue,
  ObjectValueAccessors,
  PackageContext,
  PackageValueAccessors,
} from "./types.ts";

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
  initialize: (pkgInfo: PackageContext) => T
): GetPackageValue<T> {
  const symbolKey = Symbol(friendlyName);
  return (pkgInfo: PackageContext) => {
    if (!(symbolKey in pkgInfo)) {
      pkgInfo[symbolKey] = initialize(pkgInfo);
    }
    return pkgInfo[symbolKey] as T;
  };
}

/**
 * Create has/get/set accessors for a newly created symbol key that can look up values in PackageContext
 * in a way that is guaranteed to be unique and not collide with any other properties on the package context.
 *
 * @param friendlyName name used to create a symbol key for the package info
 * @returns a set of accessors for the symbol key
 */
export function createPackageValueAccessors<T>(
  friendlyName: string
): PackageValueAccessors<T> {
  return createObjectValueAccessors<PackageContext, T>(friendlyName);
}

/**
 * Create has/get/set accessors using a newly created symbol key that can look up values in any object
 * in a way that is guaranteed to be unique and not collide with any other properties on the object.
 * @param friendlyName name used to create a symbol key for the object
 * @returns a set of accessors for the symbol key
 */
export function createObjectValueAccessors<
  TObj extends Record<string | symbol, unknown>,
  TVal,
>(friendlyName: string): ObjectValueAccessors<TObj, TVal> {
  const symbolKey = Symbol(friendlyName);
  type ObjCast = { [symbolKey]?: TVal };
  return {
    has(pkgInfo: TObj) {
      return symbolKey in pkgInfo;
    },
    get(pkgInfo: TObj) {
      return (pkgInfo as ObjCast)[symbolKey];
    },
    set(pkgInfo: TObj, value: TVal) {
      (pkgInfo as ObjCast)[symbolKey] = value;
    },
  };
}
