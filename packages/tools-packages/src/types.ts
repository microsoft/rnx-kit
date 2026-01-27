import type { PackageData } from "@rnx-kit/tools-manifest";

export type PackageInfo = PackageData & {
  /** name of the package */
  name: string;

  /** Is this a workspace package */
  workspace: boolean;

  /**
   * data storage by symbol value is allowed to have package specific values stored here. This allows
   * other packages to leverage any caching happening for PackageInfo entries to store additional
   * information and ensure it is only loaded once.
   */
  [key: symbol]: unknown;
};

/**
 * Typed accessors for retrieving values from the package info
 */
export type GetPackageValue<T> = (pkgInfo: PackageInfo) => T;

/**
 * Set of accessor functions that can be retrieved for a specific symbol
 */
export type PackageValueAccessors<T> = {
  get: GetPackageValue<T>;
  has: (pkgInfo: PackageInfo) => boolean;
  set: (pkgInfo: PackageInfo, value: T) => void;
};
