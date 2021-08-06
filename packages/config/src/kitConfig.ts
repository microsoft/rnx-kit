import type { BundleConfig } from "./bundleConfig";
import type { ServerConfig } from "./serverConfig";

export type Capability =
  | "core"
  | "core-android"
  | "core-ios"
  | "core-macos"
  | "core-windows"
  | "animation"
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
  | "lazy-index"
  | "masked-view"
  | "modal"
  | "navigation/native"
  | "navigation/stack"
  | "netinfo"
  | "popover"
  | "react"
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
 * Configuration information for an rnx-kit. This is retrieved via cosmi-config
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
   * Whether this kit produces a platform bundle. If true then all defaults will be used. Otherwise the object allows more detailed
   * specification of platform bundle functionality.
   */
  platformBundle?:
    | boolean
    | {
        /**
         * relative path for location within the package to find the built platform bundles. Defaults to './dist'
         * @default "dist"
         */
        distPath?: string;

        /**
         * prefix for the bundle name. Defaults to 'index'
         * @default "index"
         */
        bundlePrefix?: string;
      };

  /**
   * Specifies how the kit is bundled. When not defined, the kit cannot be bundled.
   */
  bundle?: BundleConfig;

  /**
   * Specifies how the kit's development bundle-server is configured. When not defined,
   * the kit will be served using default values.
   */
  server?: ServerConfig;

  /**
   * Retrieve the dependencies for the kit, either via:
   * - string: A file target to open via require
   * - DependencyVersions: An explicit list of versions to treat as part of the kit
   * - GetDependencyVerions: A function which will retrieve the dependency versions on demand
   */
  dependencies?: string | DependencyVersions | GetDependencyVersions;

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
