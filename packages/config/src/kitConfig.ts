import type { BundleConfig } from "./bundleConfig";

export type Capability =
  | "core-android"
  | "core-ios"
  | "core-macos"
  | "core-win32"
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
   * Path to custom profile provider.
   */
  customProfiles?: string;
};
