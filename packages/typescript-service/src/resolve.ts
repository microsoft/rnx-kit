import * as ts from "typescript";
import { getCanonicalFileName } from "./util";

export type Resolvers = {
  resolveModuleNames: (
    moduleNames: string[],
    containingFile: string,
    _reusedNames: string[] | undefined,
    redirectedReference?: ts.ResolvedProjectReference
  ) => (ts.ResolvedModuleFull | undefined)[];

  getResolvedModuleWithFailedLookupLocationsFromCache: (
    modulename: string,
    containingFile: string
  ) => ts.ResolvedModuleWithFailedLookupLocations | undefined;

  resolveTypeReferenceDirectives: (
    typeDirectiveNames: string[],
    containingFile: string,
    redirectedReference?: ts.ResolvedProjectReference
  ) => (ts.ResolvedTypeReferenceDirective | undefined)[];
};

export function createResolvers(options: ts.CompilerOptions): Resolvers {
  const moduleResolutionCache = ts.createModuleResolutionCache(
    ts.sys.getCurrentDirectory(),
    getCanonicalFileName,
    options
  );

  function resolveModuleNames(
    moduleNames: string[],
    containingFile: string,
    _reusedNames: string[] | undefined,
    redirectedReference?: ts.ResolvedProjectReference
  ): (ts.ResolvedModuleFull | undefined)[] {
    const resolvedModules: (ts.ResolvedModuleFull | undefined)[] = [];
    for (const moduleName of moduleNames) {
      // try to use standard resolution
      let result = ts.resolveModuleName(
        moduleName,
        containingFile,
        options,
        {
          fileExists: ts.sys.fileExists,
          readFile: ts.sys.readFile,
        },
        moduleResolutionCache,
        redirectedReference
      );
      resolvedModules.push(result.resolvedModule);
    }
    return resolvedModules;
  }

  function getResolvedModuleWithFailedLookupLocationsFromCache(
    _modulename: string,
    _containingFile: string
  ): ts.ResolvedModuleWithFailedLookupLocations | undefined {
    // TODO: implement this
    throw new Error("Not implemented");
  }

  function resolveTypeReferenceDirectives(
    typeDirectiveNames: string[],
    containingFile: string,
    redirectedReference?: ts.ResolvedProjectReference
  ): (ts.ResolvedTypeReferenceDirective | undefined)[] {
    const resolved: (ts.ResolvedTypeReferenceDirective | undefined)[] = [];
    for (const name of typeDirectiveNames) {
      let result = ts.resolveTypeReferenceDirective(
        name,
        containingFile,
        options,
        {
          fileExists: ts.sys.fileExists,
          readFile: ts.sys.readFile,
        },
        redirectedReference
      );
      resolved.push(result.resolvedTypeReferenceDirective);
    }
    return resolved;
  }

  return {
    resolveModuleNames,
    getResolvedModuleWithFailedLookupLocationsFromCache,
    resolveTypeReferenceDirectives,
  };
}
