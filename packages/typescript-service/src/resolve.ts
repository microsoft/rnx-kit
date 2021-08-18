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
 * Create a default resolver host which follows TypeScript's resolution rules.
 *
 * @param options TypeScript compiler options
 * @returns Default resolver host implementation
 */
export function createDefaultResolverHost(
  options: ts.CompilerOptions
): ResolverHost {
  const moduleResolutionHost: ts.ModuleResolutionHost = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
  };

  return {
    resolveModuleNames: (
      moduleNames: string[],
      containingFile: string,
      _reusedNames: string[] | undefined,
      redirectedReference?: ts.ResolvedProjectReference
    ): (ts.ResolvedModuleFull | undefined)[] => {
      const resolved: (ts.ResolvedModuleFull | undefined)[] = [];
      for (const name of moduleNames) {
        const result = ts.resolveModuleName(
          name,
          containingFile,
          options,
          moduleResolutionHost,
          undefined, // cache
          redirectedReference
        );
        resolved.push(result.resolvedModule);
      }
      return resolved;
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
      const resolved: (ts.ResolvedTypeReferenceDirective | undefined)[] = [];
      for (const name of typeDirectiveNames) {
        const result = ts.resolveTypeReferenceDirective(
          name,
          containingFile,
          options,
          moduleResolutionHost,
          redirectedReference
        );
        resolved.push(result.resolvedTypeReferenceDirective);
      }
      return resolved;
    },
  };
}
