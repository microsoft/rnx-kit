import type { BundlerRuntimeParameters } from "./bundleConfig";

export type ServerRequiredParameters = BundlerRuntimeParameters & {
  /**
   * Path to the root of your react-native experience project. The bundle server uses
   * this root path to resolve all web requests. Either absolute, or relative to the
   * package.
   *
   * @default "src"
   */
  projectRoot: string;
};

export type ServerParameters = Partial<ServerRequiredParameters> & {
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

export type ServerConfig = ServerParameters;
