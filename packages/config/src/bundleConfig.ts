import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import type { PluginOptions as CyclicDetectorOptions } from "@rnx-kit/metro-plugin-cyclic-dependencies-detector";
import type { Options as DuplicateDetectorOptions } from "@rnx-kit/metro-plugin-duplicates-checker";
import type { OutputOptions } from "metro";

export type TypeScriptValidationOptions = {
  /**
   * Controls whether an error is thrown when type-validation fails.
   */
  throwOnError?: boolean;
};

/**
 * Parameters controlling bundler plugins.
 */
export type BundlerPlugins = {
  /**
   * Choose whether to detect cycles in the dependency graph. `true` uses defaults,
   * while `CyclicDetectorOptions` lets you control the detection process.
   */
  detectCyclicDependencies?: boolean | CyclicDetectorOptions;

  /**
   * Choose whether to detect duplicate packages in the dependency graph. `true` uses defaults,
   * while `DuplicateDetectorOptions` lets you control the detection process.
   */
  detectDuplicateDependencies?: boolean | DuplicateDetectorOptions;

  /**
   * Choose whether to type-check source files using TypeScript. `true` uses defaults,
   * while `TypeScriptValidationOptions` lets you control the validation process.
   */
  typescriptValidation?: boolean | TypeScriptValidationOptions;

  /**
   * Choose whether to enable tree shaking.
   *
   * Note that Metro ignores custom serializers (which this feature depends on)
   * when outputting RAM bundle format.
   *
   * Only applies to `rnx-bundle` command.
   */
  treeShake?: boolean;
};

/**
 * Parameters controlling how a bundle is constructed.
 */
export type BundleParameters = BundlerPlugins & {
  /**
   * Path to the .js file which is the entry-point for building the bundle.
   * Either absolute, or relative to the package.
   */
  entryFile?: string;

  /**
   * Path to the output bundle file. Either absolute or relative to the package.
   */
  bundleOutput?: string;

  /**
   * Encoding scheme to use when writing the bundle file. Currently limited
   * to UTF-8, UTF-16 (little endian), and 7-bit ASCII.
   *
   * @see https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings
   */
  bundleEncoding?: OutputOptions["bundleEncoding"];

  /**
   * Path to use when creating the bundle source map file.
   * Either absolute, or relative to the package.
   */
  sourcemapOutput?: string;

  /**
   * Path to the package's source files. Used to make source-map paths relative and therefore portable.
   */
  sourcemapSourcesRoot?: string;

  /**
   * Controls whether or not SourceMapURL is reported as a full path or just a file name.
   */
  sourcemapUseAbsolutePath?: boolean;

  /**
   * Path where all bundle assets (strings, images, fonts, sounds, ...) are written.
   * Either absolute, or relative to the package. If not given, assets are ignored.
   */
  assetsDest?: string;

  /**
   * Force the "Indexed RAM" bundle file format, even when targeting Android.
   * For more details, see https://facebook.github.io/metro/docs/bundling.
   *
   * Only applies to the `rnx-ram-bundle` command.
   */
  indexedRamBundle?: boolean;
};

/**
 * Defines how a package is bundled. Includes shared bundling parameters with platform-specific overrides.
 */
export type BundleConfig = BundleParameters & {
  /**
   * Unique identifier for this bundle configuration. Only needed when specifying multiple bundle configurations.
   */
  id?: string;

  /**
   * The platform(s) for which this package may be bundled.
   */
  targets?: AllPlatforms[];

  /**
   * Platform-specific overrides for bundling. Any parameter not listed in an override gets
   * its value from the shared bundle configuration, or falls back to defaults.
   */
  platforms?: { [K in AllPlatforms]?: BundleParameters };
};
