import ts from "typescript";

/**
 * Host interface which allows TypeScript to ask for module and type-reference resolution.
 */
export type ResolverHost = {
  /**
   * Resolve a set of modules to their TypeScript source files or declaration (`.d.ts`) files.
   *
   * @param moduleNames List of module names to resolve
   * @param containingFile File which is importing/requiring each module
   * @returns Array of resolved module info or `undefined` if there is no resolution. Must contains one entry per module name.
   */
  resolveModuleNames: (
    moduleNames: string[],
    containingFile: string,
    reusedNames: string[] | undefined,
    redirectedReference?: ts.ResolvedProjectReference
  ) => (ts.ResolvedModuleFull | undefined)[];

  /**
   * Query the host's module resolution cache for information about a specific module.
   *
   * @param moduleName Module name
   * @param containingFile File which is importing/requiring the module
   * @returns Resolved module information, or `undefined` if there is no resolution.
   */
  getResolvedModuleWithFailedLookupLocationsFromCache: (
    moduleName: string,
    containingFile: string
  ) => ts.ResolvedModuleWithFailedLookupLocations | undefined;

  /**
   * Resolve a set of "type" reference directives to their TypeScript declaration (`.d.ts`) files.
   * This specifically resolves triple-slash type references:
   *
   *   `/// <reference type="name">`
   *
   * @param typeDirectiveNames List of type names to resolve
   * @param containingFile File which contains each triple-slash type reference
   * @returns Array of resolved type info or `undefined` if thre is no resolution. Must contain one entry per type name.
   */
  resolveTypeReferenceDirectives: (
    typeDirectiveNames: string[],
    containingFile: string,
    redirectedReference?: ts.ResolvedProjectReference
  ) => (ts.ResolvedTypeReferenceDirective | undefined)[];
};

/**
 * Create a default implementation of TypeScript's module resolution host.
 *
 * TypeScript uses this host to ask questions during module resolution. It also uses this host to report resolution trace messages.
 *
 * @returns Default module resolution host implementation
 */
 export function createDefaultModuleResolutionHost(): ts.ModuleResolutionHost {
  return {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    trace: ts.sys.write,
    directoryExists: ts.sys.directoryExists,
    realpath: ts.sys.realpath,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getDirectories: ts.sys.getDirectories,
  };
}

/**
 * Create a default resolver host which follows TypeScript's resolution rules.
 *
 * @param options TypeScript compiler options
 * @param moduleResolutionHost Optional TypeScript module resolution host. When not given, a default resolution host is used.
 * @returns Default resolver host implementation
 */
export function createDefaultResolverHost(
  options: ts.CompilerOptions,
  moduleResolutionHost: ts.ModuleResolutionHost = createDefaultModuleResolutionHost()
): ResolverHost {
  return {
    resolveModuleNames: (
      moduleNames: string[],
      containingFile: string,
      _reusedNames: string[] | undefined,
      redirectedReference?: ts.ResolvedProjectReference
    ): (ts.ResolvedModuleFull | undefined)[] => {
      return moduleNames.map((name) => {
        const result = ts.resolveModuleName(
          name,
          containingFile,
          options,
          moduleResolutionHost,
          undefined, // cache
          redirectedReference
        );
        return result.resolvedModule;
      });
    },

    getResolvedModuleWithFailedLookupLocationsFromCache: (
      _moduleName: string,
      _containingFile: string
    ): ts.ResolvedModuleWithFailedLookupLocations | undefined => {
      throw new Error("Not implemented");
    },

    resolveTypeReferenceDirectives: (
      typeDirectiveNames: string[],
      containingFile: string,
      redirectedReference?: ts.ResolvedProjectReference
    ): (ts.ResolvedTypeReferenceDirective | undefined)[] => {
      return typeDirectiveNames.map((name) => {
        const result = ts.resolveTypeReferenceDirective(
          name,
          containingFile,
          options,
          moduleResolutionHost,
          redirectedReference
        );
        return result.resolvedTypeReferenceDirective;
      });
    },
  };
}
