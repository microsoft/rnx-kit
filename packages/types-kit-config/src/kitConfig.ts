import type { BundleConfig, ServerConfig } from "@rnx-kit/types-bundle-config";
import type { AlignDepsConfig, Capability } from "./alignDeps.ts";
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
  server?: ServerConfig;

  /**
   * Supported versions of React Native. Must be parseable by
   * [node-semver](https://github.com/npm/node-semver).
   * @deprecated Use `alignDeps.requirements.production` instead.
   */
  reactNativeVersion?: string;

  /**
   * The version of React Native to use for development. Must be parseable by
   * [node-semver](https://github.com/npm/node-semver). If omitted, the minimum
   * supported version will be used.
   * @defaultValue minVersion(reactNativeVersion)
   * @deprecated Use `alignDeps.requirements.development` instead.
   */
  reactNativeDevVersion?: string;

  /**
   * Capabilities used by the kit.
   * @defaultValue `[]`
   * @deprecated Use `alignDeps.capabilities` instead.
   */
  capabilities?: Capability[];

  /**
   * Path to custom profiles. This can be a path to a JSON file, a `.js` file,
   * or a module name. The module must default export an object similar to the
   * one below.
   *
   *     module.exports = {
   *       "0.63": {
   *         "my-capability": {
   *           "name": "my-module",
   *           "version": "1.0.0",
   *         },
   *       },
   *       "0.64": {
   *         "my-capability": {
   *           "name": "my-module",
   *           "version": "1.1.0",
   *         },
   *       },
   *     };
   *
   * For a more complete example, please take a look at the default profiles:
   * https://github.com/microsoft/rnx-kit/blob/769e9fa290929effd5111884f1637c21326b5a95/packages/dep-check/src/profiles.ts#L11
   *
   * @deprecated Use `alignDeps.presets` instead.
   */
  customProfiles?: string;

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
