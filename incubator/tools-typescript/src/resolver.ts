import { type PackageModuleRef, parseModuleRef } from "@rnx-kit/tools-node";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { parseSourceFileReference } from "./platforms";

/**
 * Map of file resolution lookups, this is global as it remembers module resolutions for
 * a given source file
 */
const fileLookup: Record<
  string,
  Record<string, ts.ResolvedModuleWithFailedLookupLocations>
> = {};

/** get an entry in the cache for this module if it exists */
function lookupModuleForFile(
  module: string,
  containingFile: string
): ts.ResolvedModuleWithFailedLookupLocations | undefined {
  const entry = (fileLookup[containingFile] ??= {});
  return entry[module];
}

/** set the entry in the cache */
function setModuleForFile(
  module: string,
  containingFile: string,
  resolvedModule: ts.ResolvedModuleWithFailedLookupLocations
): void {
  const entry = (fileLookup[containingFile] ??= {});
  entry[module] = resolvedModule;
}

/**
 * Various caches for module resolution associated with package roots
 */
const rootCaches = new Map<
  string,
  {
    packageJsonCache?: ts.PackageJsonInfoCache;
    moduleCache?: ts.ModuleResolutionCache;
    typeRefCache?: ts.TypeReferenceDirectiveResolutionCache;
  }
>();

function getRootCache(root: string) {
  if (!rootCaches.has(root)) {
    rootCaches.set(root, {});
  }
  return rootCaches.get(root)!;
}

/**
 * @param root the root of the project (package root path)
 * @returns a typescript module resolution cache
 */
export function getTsModuleCache(root: string) {
  const rootCache = getRootCache(root);
  rootCache.moduleCache ??= ts.createModuleResolutionCache(
    root,
    (x) => x,
    undefined,
    rootCache.packageJsonCache
  );
  rootCache.packageJsonCache ??=
    rootCache.moduleCache.getPackageJsonInfoCache();
  return rootCache.moduleCache;
}

/**
 * @param root the root of the project (package root path)
 * @returns a typescript type reference directive resolution cache
 */
export function getTsTypeRefCache(root: string) {
  const rootCache = getRootCache(root);
  return (rootCache.typeRefCache ??=
    ts.createTypeReferenceDirectiveResolutionCache(
      root,
      (x) => x,
      undefined,
      rootCache.packageJsonCache
    ));
}

/**
 * Clear any caches that are specific to this project root
 * @param root the root of the project
 */
export function clearRootCaches(root: string) {
  rootCaches.delete(root);
}

/**
 * A resolver function which returns results in the format typescript expects. Right now this only uses
 * typescript itself to do the resolution, but this allows the actual resolve functionality to be pluggable
 */
export type ResolverForTypescript = (
  module: string,
  file: string,
  redirected?: ts.ResolvedProjectReference
) => ts.ResolvedModuleWithFailedLookupLocations;

/**
 * Information that helps resolve a module, potentially modifying it for a react-native project or with values
 * for module remapping
 */
export type ResolutionContext = {
  resolver: ResolverForTypescript;
  suffixes?: string[];
  remap?: Record<string, string>;
};

/**
 * Create a resolver function which can be used to resolve modules in a TypeScript project
 */
export function createResolverForTypescript(
  root: string,
  options: ts.CompilerOptions,
  host: ts.LanguageServiceHost
): ResolverForTypescript {
  const cache = getTsModuleCache(root);
  return (module, file, redirected) =>
    ts.resolveModuleName(module, file, options, host, cache, redirected);
}

/**
 * Helper for resolving module names, particularly for modules with platform specific suffixes.
 * Typescript will find these with the moduleSuffixes option set, but will report the resolution
 * errors for failed lookups when type-checking.
 *
 * @returns an array of successful or failed module resolutions
 */
export function resolveModuleNames(
  context: ResolutionContext,
  names: string[],
  file: string,
  redirected: ts.ResolvedProjectReference | undefined
): (ts.ResolvedModuleFull | undefined)[] {
  const { resolver, suffixes, remap } = context;
  return names.map((name) => {
    // figure out the module variants for files, or re-mapping for modules
    const entries = getModuleLookups(name, suffixes, remap).map((module, i) => {
      return {
        module,
        suffix: suffixes ? suffixes[i] : "",
        resolved: lookupModuleForFile(module, file),
      };
    });

    // find the first unchecked or found value, if it is found return it
    const first = entries.find((e) => !e.resolved || e.resolved.resolvedModule);
    const resolvedModule = first?.resolved?.resolvedModule;
    if (resolvedModule) {
      return resolvedModule;
    }

    // ensure the base entry has been resolved, this will be used to do file lookups
    let result = entries.pop();
    if (!result) {
      return undefined;
    }
    if (!result.resolved) {
      const module = result.module;
      result.resolved = resolver(module, file, redirected);
      setModuleForFile(module, file, result.resolved);
    }

    // if entries still exist in the array see if files exist for those variants
    const baseFile = result.resolved.resolvedModule?.resolvedFileName;
    if (baseFile && entries.length > 0) {
      const { base, ext } = parseSourceFileReference(baseFile, true);

      // if there is no extension this isn't a source file to try a different lookup for
      if (ext) {
        // now go through the non-base entries (.android, .native) to see if file variations exist
        for (const entry of entries) {
          const { module, suffix } = entry;
          if (fs.existsSync(base + suffix + ext)) {
            // if the file exists, have typescript try to find it
            entry.resolved = resolver(module, file, redirected);
          } else {
            // if the file doesn't exist, bypass typescript and mark it as unfound
            entry.resolved = { resolvedModule: undefined };
          }
          setModuleForFile(module, file, entry.resolved);
          if (entry.resolved.resolvedModule) {
            result = entry;
            break;
          }
        }
      }
    }
    return result.resolved?.resolvedModule;
  });
}

/**
 * Takes a file reference, either something like './folder/file' or './folder/file.js' and returns an array
 * of modifications to try given the suffixes. For instance if the suffixes are ['.ios', '.native', '.js'] then
 * - for './folder/file' returns './folder/file.ios', './folder/file.native', './folder/file.js'
 * - for './folder/file.js' returns './folder/file.ios.js', './folder/file.native.js', './folder/file.js'
 *
 * @param fileRef the file reference to multiplex with suffixes, can be with or without extension
 * @param suffixes suffixes to search
 * @returns either just the original file ref or a search list in suffix order
 */
export function getFilesToSearch(
  fileRef: string,
  suffixes?: string[]
): string[] {
  if (suffixes && suffixes.length > 0) {
    // split off the extension if it exists, then add the suffixes to try
    const { base, ext = "" } = parseSourceFileReference(fileRef, true);
    return suffixes.map((s) => (s !== "." ? `${base}${s}${ext}` : fileRef));
  }
  return [fileRef];
}

/**
 * Given a remap array, remap the module name, either 'packageName' or '@scope/packageName' if necessary.
 * This will maintain any trailing path so if we are renaming 'react-native' to 'react-native-windows' then
 * 'react-native/foo/bar' will become 'react-native-windows/foo/bar'
 */
export function remapModuleName(
  module: string,
  remap?: Record<string, string>
): string {
  if (remap) {
    const { scope, name, path } = parseModuleRef(module) as PackageModuleRef;
    const pkg = scope ? `${scope}/${name}` : name;
    if (remap[pkg]) {
      const trailing = path ? "/" + path : "";
      return remap[pkg] + trailing;
    }
  }
  return module;
}

/**
 *
 * @param fileOrModule the file or module reference, if a file it will call getFilesToSearch, if a module it will remap if needed
 * @param suffixes optional array of suffixes for this build
 * @param remap optional module name remapper
 * @returns
 */
export function getModuleLookups(
  fileOrModule: string,
  suffixes?: string[],
  remap?: Record<string, string>
): string[] {
  if (fileOrModule.startsWith("./") || path.isAbsolute(fileOrModule)) {
    return getFilesToSearch(fileOrModule, suffixes);
  }
  return [remapModuleName(fileOrModule, remap)];
}
