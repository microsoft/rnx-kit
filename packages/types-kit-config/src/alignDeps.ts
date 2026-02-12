export type MetaCapability = "core/testing";

/**
 * Core built in align deps capabilities
 */
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

/**
 * Configuration for align-deps, which can be specified in the `alignDeps` field of the rnx-kit config.
 *
 * Templated to allow extending capabilities with custom values, which are internally treated as strings.
 */
export type AlignDepsConfig<TCaps extends Capability = Capability> = {
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
  capabilities?: TCaps[];
};
