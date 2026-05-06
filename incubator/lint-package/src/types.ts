import type { JSONValidatorOptions } from "@rnx-kit/lint-json";
import type { PackageManifest } from "@rnx-kit/types-node";
import type { Yarn } from "@yarnpkg/types";

/**
 * Options for configuring a PackageValidationContext instance.
 */
export type PackageValidationOptions<
  TManifest extends PackageManifest = PackageManifest,
> = JSONValidatorOptions & {
  /**
   * Optional package manifest to use instead of loading from the package root, in case it is already loaded
   * and available to avoid reading from disk again.
   */
  manifest?: TManifest;

  /**
   * Yarn workspace instance to use instead of operating on the package root directly
   */
  workspace?: Yarn.Constraints.Workspace;
};
