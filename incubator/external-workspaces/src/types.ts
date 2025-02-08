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
