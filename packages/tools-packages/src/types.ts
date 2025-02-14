import type { PackageManifest } from "@rnx-kit/tools-node";

export type PackageInfo = {
  /** name of the package */
  name: string;

  /** full path to the package */
  root: string;

  /** Access the loaded package.json for the package */
  manifest: PackageManifest;

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
 * Accessor function that can be created for looking up information associated with a package.
 */
export type PackageInfoAccessor<T> = (pkgInfo: PackageInfo) => T;
