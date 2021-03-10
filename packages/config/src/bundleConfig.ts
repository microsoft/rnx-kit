/**
 * List of supported kit platforms.
 */
export type AllPlatforms = "ios" | "android" | "windows" | "win32" | "macos";

/**
 * Parameters controlling how a bundle is constructed.
 */
export interface BundleParameters {
  /**
   * Relative path to the .js file which is the entry-point for building the bundle.
   *
   * @default "./lib/index.js"
   */
  entryPath?: string;

  /**
   * Relative path where the bundle (and related files) are written.
   *
   * @default "./dist"
   */
  distPath?: string;

  /**
   * Relative path where all bundle assets (strings, images, fonts, sounds, ...) are written.
   *
   * @default "./dist"
   */
  assetsPath?: string;

  /**
   * Prefix for the bundle name, followed by the platform and either ".bundle" (win, android)
   * or ".jsbundle" (mac, ios).
   *
   * @default "index"
   */
  bundlePrefix?: string;
}

/**
 * Defines how a kit is bundled. Includes shared bundling parameters with platform-specific overrides.
 */
export type BundleDefinition = BundleParameters & {
  /**
   * Unique identifier for this bundle definition. Only used as a reference within the kit build system.
   */
  id?: string;

  /**
   * The platform(s) for which this kit may be bundled.
   */
  targets?: AllPlatforms[];

  /**
   * Platform-specific overrides for bundling parameters. Any parameter not listed in an override gets
   * its value from the shared bundle definition, or falls back to defaults.
   */
  platforms?: { [K in AllPlatforms]: BundleParameters };
};

/**
 * Bundle definition with all parameters resolved to user-provided values or defaults.
 */
export type BundleDefinitionResolved = Omit<
  BundleDefinition,
  keyof BundleParameters
> &
  Required<BundleParameters>;

/**
 * Bundle configuration for a kit. If true, then all defaults will be used.
 * Otherwise, the bundle definition object(s) allow more detailed specification of bundling parameters.
 */
export type BundleConfig = boolean | BundleDefinition | BundleDefinition[];
