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

/**
 * Signature of the function to retrieve information about a given package. If the configuration setting routes
 * to a .js or .cjs file instead of .json, the default export should be a function of this signature.
 */
export type DefinitionFinder = (pkgName: string) => PackagePaths | null;

/**
 * Format of the output file for repo and workspace information. Anything outside of the generated
 * section will be maintained as-is.
 */
export type WorkspaceOutputJson = {
  generated: {
    /**
     * The version of the output format
     */
    version: string;

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
};
export type WorkspaceOutputGeneratedContent = WorkspaceOutputJson["generated"];
