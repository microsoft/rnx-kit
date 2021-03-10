/**
 * List of supported kit platforms.
 */
export type AllPlatforms = "ios" | "android" | "windows" | "win32" | "macos";

/**
 * Parameters controlling how a bundle is constructed.
 */
export interface BundleParameters {
  /**
   * Path to the .js file which is the entry-point for building the bundle.
   * Either absolute, or relative to the package.
   *
   * @default "./lib/index.js"
   */
  entryPath?: string;

  /**
   * Path where the bundle and source map files are written.
   * Either absolute, or relative to the package.
   *
   * @default "./dist"
   */
  distPath?: string;

  /**
   * Path where all bundle assets (strings, images, fonts, sounds, ...) are written.
   * Either absolute, or relative to the package.
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

  /**
   * Encoding scheme to use when writing the bundle file.
   *
   * @see "https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings"
   */
  bundleEncoding?: string;

  /**
   * Path to use when creating the bundle source map file.
   * Either absolute, or relative to the package.
   */
  sourceMapPath?: string;

  /**
   * Path to the package's source files. Used to make source-map paths relative and therefore portable.
   */
  sourceMapSourceRootPath?: string;

  /**
   * Whether to report SourceMapURL using its full path
   */
  sourceMapUseAbsolutePaths?: boolean;
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
 * Bundle configuration for a kit. If true, then all defaults will be used.
 * Otherwise, the bundle definition object(s) allow more detailed specification of bundling parameters.
 */
export type BundleConfig = boolean | BundleDefinition | BundleDefinition[];
