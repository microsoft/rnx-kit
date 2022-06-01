import type { BundlerPlugins } from "./bundleConfig";

export type ServerConfig = BundlerPlugins & {
  /**
   * Path to the root of your react-native experience project. The bundle server uses
   * this root path to resolve all web requests. Either absolute, or relative to the
   * package.
   *
   * Note that `projectRoot` should also contain your Babel config, otherwise
   * Metro won't be able to find it. For details, see
   * https://github.com/microsoft/rnx-kit/issues/706.
   */
  projectRoot?: string;

  /**
   * Additional asset plugins to be used by the Metro Babel transformer. Comma-separated
   * list containing plugin modules and/or absolute paths to plugin packages.
   */
  assetPlugins?: string[];

  /**
   * Additional source-file extensions to include when generating bundles. Comma-separated
   * list, excluding the leading dot.
   */
  sourceExts?: string[];
};
