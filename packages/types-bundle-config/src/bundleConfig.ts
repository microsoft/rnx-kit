import type { OutputOptions } from "metro/private/shared/types";
import type { AllPlatforms } from "./allPlatforms.ts";
import type { BundlerPlugins, Plugin } from "./bundlerPlugins.ts";
import type { HermesOptions } from "./hermesOptions.ts";
import type { SerializerEsbuildOptions } from "./plugins/serializerEsbuildOptions.ts";

export type BundleOutputOptions = {
  /**
   * Path to the output bundle file. Either absolute or relative to the package.
   */
  bundleOutput?: OutputOptions["bundleOutput"];

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
  sourcemapOutput?: OutputOptions["sourcemapOutput"];

  /**
   * Path to the package's source files. Used to make source-map paths relative and therefore portable.
   */
  sourcemapSourcesRoot?: OutputOptions["sourcemapSourcesRoot"];

  /**
   * Controls whether or not SourceMapURL is reported as a full path or just a file name.
   */
  sourcemapUseAbsolutePath?: OutputOptions["sourcemapUseAbsolutePath"];

  /**
   * Force the "Indexed RAM" bundle file format, even when targeting Android.
   * For more details, see https://facebook.github.io/metro/docs/bundling.
   *
   * Only applies to the `rnx-ram-bundle` command.
   *
   * @deprecated {@link https://github.com/facebook/react-native/pull/43292}
   */
  indexedRamBundle?: OutputOptions["indexedRamBundle"];
};

/**
 * Parameters controlling how a bundle is constructed.
 */
export type BundleParameters = BundlerPlugins &
  BundleOutputOptions & {
    /**
     * Path to the .js file which is the entry-point for building the bundle.
     * Either absolute, or relative to the package.
     */
    entryFile?: string;

    /**
     * Path where all bundle assets (strings, images, fonts, sounds, ...) are written.
     * Either absolute, or relative to the package. If not given, assets are ignored.
     */
    assetsDest?: string;

    /**
     * Choose whether to enable tree shaking.
     *
     * Note that Metro ignores custom serializers (which this feature depends on)
     * when outputting RAM bundle format.
     *
     * Only applies to `rnx-bundle` command.
     */
    treeShake?: boolean | SerializerEsbuildOptions;

    /**
     * Whether to run the Hermes compiler on the output bundle.
     *
     * Only applies to `rnx-bundle` command.
     */
    hermes?: boolean | HermesOptions;

    /**
     * List of plugins to add to the bundling process.
     *
     * @default [
     *   "@rnx-kit/metro-plugin-cyclic-dependencies-detector",
     *   "@rnx-kit/metro-plugin-duplicates-checker",
     *   "@rnx-kit/metro-plugin-typescript"
     * ]
     */
    plugins?: Plugin[];
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
  platforms?: Partial<Record<AllPlatforms, BundleParameters>>;
};
