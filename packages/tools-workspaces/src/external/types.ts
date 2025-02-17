/**
 * Data needed to resolve an external package.
 */
export type PackageDefinition = {
  /**
   * The path to the root of the package on the local filesystem, relative to the
   * location of the configuration file. Absolute paths will be supported but are are
   * not recommended unless the configuration is dynamically generated.
   */
  path?: string;

  /**
   * The version of the package to install if it does not exist in the local file system.
   */
  version: string;
};

/**
 * Format of the config file in JSON format, this is a set of package definitions where the keys
 * are the package names. E.g.:
 * {
 *  "my-package": { "path": "./path/to/my-package", "version": "1.2.3" },
 *  "my-other-package": { "path": "./path/to/my-other-package", "version": "1.2.3" }
 * }
 */
export type ExternalDeps = Record<string, PackageDefinition>;

/**
 * Signature of the function to retrieve information about a given package. If the configuration setting routes
 * to a .js or .cjs file instead of .json, the default export should be a function of this signature.
 */
export type DefinitionFinder = (pkgName: string) => PackageDefinition | null;

/**
 * Settings for a single configuration option for the plugin. Can be mapped into the yarn types or otherwise
 */
export type ConfigurationEntry<T> = {
  /**
   * The key used to store the setting in the yarn configuration
   */
  configKey: string;

  /**
   * Type of the setting
   */
  settingType: "string" | "boolean";

  /**
   * Description of the option
   */
  description: string;

  /**
   * Default value of the option
   */
  defaultValue: T;
};

/**
 * The type of the configuration options for the plugin
 */
export type ConfigurationOptions = {
  configPath: ConfigurationEntry<string>;
  enableLogging: ConfigurationEntry<boolean>;
  outputWorkspaces: ConfigurationEntry<string>;
};

// type inference helper for having strongly typed settings
type ConfigurationEntryValue<T> =
  T extends ConfigurationEntry<infer U> ? U : never;

/**
 * Loaded settings, just the values of the specified type for each entry + the finder function
 */
export type Settings = {
  [key in keyof ConfigurationOptions]: ConfigurationEntryValue<
    ConfigurationOptions[key]
  >;
} & { finder: DefinitionFinder };
