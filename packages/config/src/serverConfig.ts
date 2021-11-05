import type { BundlerRuntimeParameters } from "./bundleConfig";

export type ServerRequiredParameters = Omit<
  BundlerRuntimeParameters,
  "projectRoot"
>;

export type ServerParameters = Partial<ServerRequiredParameters> & {
  projectRoot?: BundlerRuntimeParameters["projectRoot"];

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
