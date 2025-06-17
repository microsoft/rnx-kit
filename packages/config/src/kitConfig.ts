import type { RuleOptions as NoDuplicatesRuleOptions } from "@rnx-kit/lint-lockfile/src/rules/noDuplicates";
import type { RuleOptions as NoWorkspacePackageFromNpmRuleOptions } from "@rnx-kit/lint-lockfile/src/rules/noWorkspacePackageFromNpm";
import type { BundleConfig } from "./bundleConfig";
import type { ServerConfig } from "./serverConfig";

export type MetaCapability = "core/testing";

export type Capability =
  | MetaCapability
  | "core"
  | "core-android"
  | "core-ios"
  | "core-macos"
  | "core-visionos"
  | "core-windows"
  | "core/metro-config"
  | "animation"
  | "babel-preset-react-native"
  | "base64"
  | "checkbox"
  | "clipboard"
  | "community/cli"
  | "community/cli-android"
  | "community/cli-ios"
  | "datetime-picker"
  | "filesystem"
  | "floating-action"
  | "gestures"
  | "hermes"
  | "hooks"
  | "html"
  | "jest"
  | "lazy-index"
  | "masked-view"
  | "metro"
  | "metro-config"
  | "metro-core"
  | "metro-react-native-babel-transformer"
  | "metro-resolver"
  | "metro-runtime"
  | "modal"
  | "navigation/native"
  | "navigation/stack"
  | "netinfo"
  | "popover"
  | "react"
  | "react-dom"
  | "react-test-renderer"
  | "safe-area"
  | "screens"
  | "shimmer"
  | "sqlite"
  | "storage"
  | "svg"
  | "test-app"
  | "webview";

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
  alignDeps?: {
    /**
     * Presets to use for aligning dependencies.
     * @defaultValue `["microsoft/react-native"]`
     */
    presets?: string[];

    /**
     * Requirements for this package, e.g. `react-native@>=0.66`.
     */
    requirements?: string[] | { development: string[]; production: string[] };

    /**
     * Capabilities used by the kit.
     * @defaultValue `[]`
     */
    capabilities?: Capability[];
  };

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
