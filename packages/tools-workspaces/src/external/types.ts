/**
 * Data needed to resolve an external package.
 */
export type PackageDefinition = {
  /**
   * Relative path to the package location from wherever the definition is defined. If these are loaded from
   * a .json file, this will be relative to the location of the .json file.
   */
  path: string | null;

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
 * Trace function used to log messages if logging is enabled. If logOnly is set to true, the message will only be written to
 * the log file and not to the console. In essence log files are equivalent to verbose mode.
 */
export type TraceFunc = (msg: string) => void;

/**
 * Options for outputting the current repos workspaces to a .json file
 */
export type OutputWorkspacesOptions = {
  /**
   * The path to a directory where the plugin should output the current set of workspaces. The same ./path/file.json[/key1/key2] syntax
   * can be used here as well to write to a subpath of the .json file. The file will not be modified if the workspaces have not changed,
   * and it will retain the prior contents not in the specified key. Workspaces within the key will be replaced.
   */
  readonly outputPath: string;

  /**
   * By default, the workspaces will be written out as part of install. If this is set to true, the workspaces will only be written out
   * when the command is invoked.
   */
  readonly outputOnlyOnCommand: boolean;
};

/**
 * Full configuration options for external workspaces. Stored in the root package.json under the "external-workspaces" key.
 */
export type ExternalWorkspacesConfig = Partial<OutputWorkspacesOptions> & {
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

export type ExternalWorkspaces = OutputWorkspacesOptions & {
  /**
   * Function used to look up the external workspaces config. This will include existence validation and caching when called, such that
   * when a package is queried the path entry will only be set if the package exists locally.
   */
  findPackage: DefinitionFinder;

  /**
   * Function used to output workspaces to a file.
   */
  outputWorkspaces(
    workspaces: ExternalDeps,
    outputPath?: string,
    checkOnly?: boolean
  ): void;

  /**
   * Trace to a log file if it is enabled, or console if 'console' is specified as the logfile
   */
  trace: TraceFunc;

  /**
   * Report out to the console, regardless of log setting
   */
  report: TraceFunc;

  /**
   * Root path of the repository, relative to process.cwd()
   */
  readonly root: string;
};
