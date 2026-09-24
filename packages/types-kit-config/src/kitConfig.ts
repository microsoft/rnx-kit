import type {
  BundleConfig,
  BundleParameters,
} from "@rnx-kit/types-bundle-config";
import type { AlignDepsConfig } from "./alignDeps.ts";
import type {
  NoDuplicatesRuleOptions,
  NoWorkspacePackageFromNpmRuleOptions,
} from "./lint.types.ts";

export type DependencyVersions = Record<string, string>;

export type GetDependencyVersions = () => DependencyVersions;

export type KitType = "app" | "library";

/**
 * Configuration information for an rnx-kit package. This is retrieved from 'rnx-kit' in package.json.
 */
export type KitConfig = {
  /**
   * Load base config from file or module.
   */
  extends?: string;

  /**
   * Whether this kit is an "app" or a "library".
   * @defaultValue `"library"`
   */
  kitType?: KitType;

  /**
   * Configures how `align-deps` should align dependencies for this package.
   */
  alignDeps?: AlignDepsConfig;

  /**
   * Specifies how the package is bundled.
   */
  bundle?: BundleConfig | BundleConfig[];

  /**
   * Specifies how the package's bundle server is configured.
   */
  server?: BundleParameters;

  /**
   * Configures rnx-kit linting tools and their rules.
   */
  lint?: {
    /**
     * Configures `@rnx-kit/lint-lockfile`.
     */
    lockfile?: {
      noDuplicates?: NoDuplicatesRuleOptions;
      noWorkspacePackageFromNpm?: NoWorkspacePackageFromNpmRuleOptions;
    };
  };
};
