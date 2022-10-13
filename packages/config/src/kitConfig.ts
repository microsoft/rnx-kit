import type { BundleConfig } from "./bundleConfig";
import type { ServerConfig } from "./serverConfig";

export type MetaCapability = "core/testing";

export type Capability =
  | MetaCapability
  | "core"
  | "core-android"
  | "core-ios"
  | "core-macos"
  | "core-windows"
  | "animation"
  | "babel-preset-react-native"
  | "base64"
  | "checkbox"
  | "clipboard"
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
   * Whether this kit is an "app" or a "library".
   * @default "library"
   */
  kitType?: KitType;

  /**
   * Supported versions of React Native. Must be parseable by
   * [node-semver](https://github.com/npm/node-semver).
   */
  reactNativeVersion?: string;

  /**
   * The version of React Native to use for development. Must be parseable by
   * [node-semver](https://github.com/npm/node-semver). If omitted, the minimum
   * supported version will be used.
   * @default minVersion(reactNativeVersion)
   */
  reactNativeDevVersion?: string;

  /**
   * Configures how `align-deps` should align dependencies for this package.
   */
  alignDeps?: {
    /**
     * Presets to use for aligning dependencies.
     * @default ["microsoft/react-native"]
     */
    presets?: string[];

    /**
     * Requirements for this package, e.g. `react-native@>=0.66`.
     */
    requirements?: string[] | { development: string[]; production: string[] };

    /**
     * Capabilities used by the kit.
     * @default []
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
   * Capabilities used by the kit.
   * @default []
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
   */
  customProfiles?: string;
};
