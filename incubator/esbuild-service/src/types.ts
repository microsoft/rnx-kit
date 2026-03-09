import type { AllPlatforms } from "@rnx-kit/types-bundle-config";
import type { BuildOptions, Plugin } from "esbuild";

/**
 * Options for bundling a React Native application with esbuild.
 */
export type BundleServiceOptions = {
  /**
   * Path to the entry file (e.g. `index.js`).
   */
  entryFile: string;

  /**
   * Target platform.
   */
  platform: AllPlatforms;

  /**
   * Whether to bundle in development mode.
   * Defaults to `false`.
   */
  dev?: boolean;

  /**
   * Whether to minify the output.
   * Defaults to `true` when `dev` is `false`.
   */
  minify?: boolean;

  /**
   * Path to write the bundle to.
   */
  bundleOutput: string;

  /**
   * Path to write the source map to.
   */
  sourcemapOutput?: string;

  /**
   * Destination directory for asset files. When set, all assets referenced
   * by the bundle are copied to this directory after bundling.
   */
  assetsDest?: string;

  /**
   * Destination directory for iOS asset catalogs (`RNAssets.xcassets`).
   * Only relevant for iOS builds.
   */
  assetCatalogDest?: string;

  /**
   * Additional Metro asset data plugins to apply to every asset.
   * Each entry is a module path whose default export transforms `AssetData`.
   */
  assetDataPlugins?: string[];

  /**
   * The esbuild target environment. Defaults to the appropriate Hermes target
   * inferred from the installed version of `react-native`.
   */
  target?: string | string[];

  /**
   * Additional esbuild plugins to include in the build pipeline.
   */
  plugins?: Plugin[];

  /**
   * Additional paths to use when resolving modules, in addition to the
   * standard Node.js module resolution.
   */
  moduleDirectories?: string[];

  /**
   * The project root directory. Defaults to `process.cwd()`.
   */
  projectRoot?: string;

  /**
   * The log level to pass to esbuild.
   */
  logLevel?: BuildOptions["logLevel"];

  /**
   * When enabled, esbuild will drop `debugger` statements, `console` calls,
   * or both from the bundle. See https://esbuild.github.io/api/#drop.
   */
  drop?: BuildOptions["drop"];

  /**
   * Sets `/* @__PURE__ *\/` annotation for the specified new or call
   * expressions. See https://esbuild.github.io/api/#pure.
   */
  pure?: BuildOptions["pure"];
};
