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
 * Trace function used to log messages if logging is enabled
 */
export type TraceFunc = (msg: string) => void;

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

export type OutputWorkspacesOptions = {
  /**
   * The path to a directory where the plugin should output the current set of workspaces. The same ./path/file.json[/key1/key2] syntax
   * can be used here as well to write to a subpath of the .json file. The file will not be modified if the workspaces have not changed,
   * and it will retain the prior contents not in the specified key. Workspaces within the key will be replaced.
   */
  outputPath?: string;

  /**
   * If set, the workspaces will be written out after the install step. If not set this will need to be done manually.
   */
  outputAfterInstall?: boolean;

  /**
   * Whether to include private workspaces in the output. By default they will be skipped.
   */
  outputPrivateWorkspaces?: boolean;
};

export type ExternalWorkspacesConfig = OutputWorkspacesOptions & {
  /**
   * This setting specifies how to load the set of external dependencies. It can be of type string or ExternalDeps.
   * For strings:
   * - Path to a .json file in the ExternalDeps format. Optionally can have a set of keys in the form of "./path/file.json/subpath" if the
   *   dependency entries are not at the top level of the .json file.
   * - Path to a .js file that exports a function of type DefinitionFinder as the default export.
   * For ExternalDeps:
   * - A set of package definitions in the form of { "package-name": { path: "path/to/package", version: "1.2.3" } }
   *
   * If unset or empty, the plugin will not attempt to intercept any external dependencies.
   */
  externalDependencies?: string | ExternalDeps;

  /**
   * If set, the plugin will produce detailed output logging to the specified file. In many cases console output is captured so logs
   * work much better sent to a file. If the value is "console" it will log to the console but this will require running in verbose mode.
   */
  logTo?: string;
};

export type ExternalWorkspacesSettings = OutputWorkspacesOptions & {
  /**
   * Function used to look up the external workspaces config. This will include existence validation and caching when called, such that
   * when a package is queried the path entry will only be set if the package exists locally.
   */
  finder: DefinitionFinder;

  /**
   * Tracing function, will do nothing if logging is not enabled, otherwise will write to the target output
   * @param msg message to write to either the console or the log file
   */
  trace: TraceFunc;
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
