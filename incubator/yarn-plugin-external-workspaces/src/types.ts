/**
 * Data needed to resolve an external package.
 */
export type PackagePaths = {
  /**
   * Relative path to the package location from wherever the definition is defined. If these are loaded from
   * a .json file, this will be relative to the location of the .json file.
   */
  path: string | null;

  /**
   * Optional fallback target in case the package is not present on-disk. This should be in the form of a yarn
   * hardlink protocol. e.g. "file:./path/to/package.tgz"
   * -- NOT YET IMPLEMENTED --
   */
  fallbackPath?: string;
};

export type ExternalPackage = PackagePaths & {
  /**
   * The name of the package
   */
  name: string;
};

/**
 * Format for the generated section of the output file for repo and workspace information.
 */
export type WorkspaceOutputGeneratedContent = {
  /**
   * Relative path from the recorded file to the root of the repository
   */
  repoPath: string;

  /**
   * Set of workspaces in the repository, with paths relative to the repo root in the form of:
   * - Record<"@scope/package-name", "./path/to/package">
   */
  workspaces: Record<string, string>;
};

/**
 * Format of the output file for repo and workspace information. Anything outside of the generated
 * section will be maintained as-is.
 */
export type WorkspaceOutputJson = {
  generated: WorkspaceOutputGeneratedContent;
};

/**
 * Format of the config file in JSON format, this is a set of package definitions where the keys
 * are the package names. E.g.:
 * {
 *  "my-package": { "path": "./path/to/my-package", "version": "1.2.3" },
 *  "my-other-package": { "path": "./path/to/my-other-package", "version": "1.2.3" }
 * }
 */
export type ExternalDeps = Record<string, PackagePaths>;

/**
 * Signature of the function to retrieve information about a given package. If the configuration setting routes
 * to a .js or .cjs file instead of .json, the default export should be a function of this signature.
 */
export type DefinitionFinder = (pkgName: string) => PackagePaths | null;

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
   * The path to a .json file (including the .json file name) where workspace info should be recorded. Format of the file will be
   * maintained as-is with the exception of the generated section. See WorkspaceOutputJson above
   */
  readonly outputPath: string;

  /**
   * By default, the workspaces will be written out as part of install. If this is set to true, the workspaces will only be written out
   * when the command is invoked.
   */
  readonly outputOnlyOnCommand: boolean;
};

/**
 * Set of workspace paths in the form of { "@scope/package-name": "./path/to/package" }
 */
export type WorkspacePaths = Record<string, string>;

/**
 * Full configuration options for external workspaces. Stored in the root package.json under the "external-workspaces" key.
 */
export type ExternalWorkspacesConfig = Partial<OutputWorkspacesOptions> & {
  /**
   * This setting specifies how to load the set of external dependencies. It can be of type string or WorkspacePaths.
   * - string path to a .json file in the WorkspaceOutputJson format.
   * - string path to a .js file that exports a function of type DefinitionFinder as the default export.
   * - A set of package definitions in the form of { "@scope/package-name": "./path/to/package" }
   *
   * If unset or empty, the plugin will not attempt to intercept any external dependencies.
   */
  externalDependencies?: string | WorkspacePaths;

  /**
   * If enabled print out detailed logging output during operations to the console.
   */
  logging?: boolean;
};

export type ExternalWorkspace = {
  /**
   * The name of the package
   */
  name: string;

  /**
   * Resolved path to the package root.
   */
  path?: string;
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
    workspaces: Record<string, string>,
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
