import type { OutputOptions } from "metro";
import type { PluginOptions as CyclicDetectorOptions } from "@rnx-kit/metro-plugin-cyclic-dependencies-detector";
import type { Options as DuplicateDetectorOptions } from "@rnx-kit/metro-plugin-duplicates-checker";

/**
 * List of supported kit platforms.
 */
export type AllPlatforms = "ios" | "android" | "windows" | "win32" | "macos";

/**
 * Parameters controlling bundler behavior at runtime.
 */
export type BundlerRuntimeParameters = {
  /**
   * Choose whether to detect cycles in the dependency graph. If true, then a default set
   * of options will be used. Otherwise the object allows for fine-grained control over
   * the detection process.
   *
   * @default true
   */
  detectCyclicDependencies: boolean | CyclicDetectorOptions;

  /**
   * Choose whether to detect duplicate packages in the dependency graph.
   *
   * A duplicate error happens when a package is imported from two or more unique paths,
   * even if the versions are all the same. Duplicate packages increase bundle size and
   * can lead to unexpected errors.
   *
   * If true, then a default set of options will be used. Otherwise the object allows for
   * fine-grained control over the detection process.
   *
   * @default true
   */
  detectDuplicateDependencies: boolean | DuplicateDetectorOptions;

  /**
   * Choose whether to type-check source files using TypeScript.
   *
   * @default true
   */
  typescriptValidation: boolean;

  /**
    * Choose whether to enable tree shaking.

    * ⚠️ **THIS FEATURE IS HIGHLY EXPERIMENTAL** ⚠️
    *
    * @default false
    */
  experimental_treeShake: boolean;
};

/**
 * Parameters controlling how a bundle is constructed.
 */
export type BundleRequiredParameters = BundlerRuntimeParameters & {
  /**
   * Path to the .js file which is the entry-point for building the bundle.
   * Either absolute, or relative to the package.
   *
   * @default "lib/index.js"
   */
  entryPath: string;

  /**
   * Path where the bundle and source map files are written.
   * Either absolute, or relative to the package.
   *
   * @default "dist"
   */
  distPath: string;

  /**
   * Path where all bundle assets (strings, images, fonts, sounds, ...) are written.
   * Either absolute, or relative to the package.
   *
   * @default "dist"
   */
  assetsPath: string;

  /**
   * Prefix for the bundle name, followed by the platform and either ".bundle" (win, android)
   * or ".jsbundle" (mac, ios).
   *
   * @default "index"
   */
  bundlePrefix: string;
};

export type BundleParameters = Partial<BundleRequiredParameters> & {
  /**
   * Encoding scheme to use when writing the bundle file. Currently limited
   * to UTF-8, UTF-16 (little endian), and 7-bit ASCII.
   *
   * @see "https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings"
   */
  bundleEncoding?: OutputOptions["bundleEncoding"];

  /**
   * Path to use when creating the bundle source map file.
   * Either absolute, or relative to the package.
   */
  sourceMapPath?: string;

  /**
   * Path to the package's source files. Used to make source-map paths relative and therefore portable.
   */
  sourceMapSourceRootPath?: string;
};

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
  platforms?: { [K in AllPlatforms]?: BundleParameters };
};

/**
 * Bundle configuration for a kit. If true, then all defaults will be used.
 * Otherwise, the bundle definition object(s) allow more detailed specification of bundling parameters.
 */
export type BundleConfig = boolean | BundleDefinition | BundleDefinition[];
