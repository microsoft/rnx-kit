import { parseModuleRef } from "@rnx-kit/tools-node";
import intersection from "lodash/intersection";
import isEqual from "lodash/isEqual";
import ts from "typescript";
import type { ResolverContext } from "./types";

function isPackageRef(name: string): boolean {
  return !parseModuleRef(name).path;
}

/**
 * Get TypeScript compiler options with the `moduleSuffixes` property configured
 * for the current React Native project. `moduleSuffixes` must contain all of the
 * React Native platform file extensions -- in precedence order.
 *
 * Examine the given set of compiler options for the project. If `moduleSuffixes`
 * is already set, and it does not contain the right React Native entries, we will
 * throw an error. We cannot proceed because there's no way to **safely** add to
 * `moduleSuffixes`. Additions change the way modules are resolved to files, and
 * can only be done reliably by the package owner.
 *
 * When an error is thrown, it explains this, and offers some options to the developer.
 *
 * @param context Resolver context. Describes the current React Native project.
 * @param moduleName Name of the module being resolved (used for error reporting).
 * @param containingFile File containing the module reference (used for error reporting).
 * @param options Compiler options for the module
 * @returns Compiler options with a `moduleSuffixes` property containing the list of React Native platform file extensions. This may be input options object, or it may be a copy (if changes were made).
 */
export function getCompilerOptionsWithReactNativeModuleSuffixes(
  context: ResolverContext,
  moduleName: string,
  containingFile: string,
  options: ts.CompilerOptions
): ts.CompilerOptions {
  if (!options.moduleSuffixes) {
    //  `moduleSuffixes` is not defined. Return a copy of the input object with
    //  `moduleSuffixes` set to the list of React Native platform extensions.
    return {
      ...options,
      moduleSuffixes: context.platformFileExtensions,
    };
  }

  //  `moduleSuffixes` is already defined in the module's compiler options.
  //  We cannot safely modify it because we don't know how to order the entries
  //  when adding those needed for React Native. Ordering matters because it controls
  //  file selection. e.g. If "ios" comes before "native", then "foo.ios.ts" will be
  //  resolved ahead of "foo.native.ts".
  //
  //  Package authors may use a convention where they set 'moduleSuffixes' to [".native", ""].
  //  They do this when they don't have platform-specific code (e.g. iOS only). Instead,
  //  they use suffixes to separate React Native code (.native.ts) from Web code (.ts). We
  //  allow that convention as well.
  //
  //  The best we can do is check `moduleSuffixes` for either of these conventions, and fail
  //  if they aren't met.

  const hasAllPlatformFileExtensions = isEqual(
    intersection(options.moduleSuffixes, context.platformFileExtensions),
    context.platformFileExtensions
  );

  const nativePlatformFileExtension = [".native", ""];
  const hasNativePlatformFileExtension = isEqual(
    intersection(options.moduleSuffixes, nativePlatformFileExtension),
    nativePlatformFileExtension
  );
  if (!hasAllPlatformFileExtensions && !hasNativePlatformFileExtension) {
    const currentSuffixes = options.moduleSuffixes.join(",");
    const neededAllSuffixes = context.platformFileExtensions.join(",");
    const neededNativeSuffixes = nativePlatformFileExtension.join(",");
    throw new Error(
      `Failed to resolve module reference '${moduleName}' in source file '${containingFile}.\n` +
        `The parent package has a TypeScript configuration which sets 'moduleSuffixes' to '${currentSuffixes}'.\n` +
        `This is incompatible with the target platform '${context.platform}', which requires 'moduleSuffixes' to contain either '${neededAllSuffixes}' or just '${neededNativeSuffixes}', in order.\n` +
        `We would like to understand any use cases where this error occurs, as there may be room to make improvements.\n` +
        `Please add a comment about your scenario, and include this error message: https://github.com/microsoft/rnx-kit/discussions/1971.`
    );
  }

  // Return the original compiler options, since we know they have the right
  // `moduleSuffixes` entries for React Native resolution.
  return options;
}

/**
 * Resolves a module to a file using TypeScript's built-in module resolver and
 * the `moduleSuffixes` compiler option.
 *
 * @param context Resolver context. Describes the current React Native project.
 * @param moduleName Name of the module being resolved.
 * @param containingFile File containing the module reference.
 * @param redirectedReference Head node in the program's graph of type references
 * @param options Compiler options for the module.
 * @param ts Used for _mocking_ only. This parameter must _always_ be last.
 * @returns
 */
export function resolveModuleName(
  context: ResolverContext,
  moduleName: string,
  containingFile: string,
  redirectedReference: ts.ResolvedProjectReference | undefined,
  options: ts.CompilerOptions,
  { resolveModuleName } = ts
): ts.ResolvedModuleFull | undefined {
  // Ensure the compiler options has `moduleSuffixes` set correctly for this RN
  // project. If `moduleName` points to a package (no paths), don't add platform
  // suffixes as they are not used when looking at main fields.
  const optionsWithSuffixes = isPackageRef(moduleName)
    ? options
    : getCompilerOptionsWithReactNativeModuleSuffixes(
        context,
        moduleName,
        containingFile,
        options
      );

  //
  //  Invoke the built-in TypeScript module resolver.
  //
  //  One of the params it takes is a module resolution cache. We don't currently use
  //  this, and TypeScript can operate without it, though it may be slower. We have not
  //  done perf analysis to see how much of a benefit the cache provides.
  //
  //  If, down the road, we decide to add a cache, it should be created using:
  //
  //    `ts.createModuleResolutionCache(currentDirectory, getCanonicalFileName, options)`.
  //
  //  And we should store each per-directory cache in a map, attached to `context`.
  //
  const cache: ts.ModuleResolutionCache | undefined = undefined;

  //  Another param the resolver takes is an explicit resolution mode: CommonJS or ESNext.
  //  It is optional, and we leave it undefined, so that TypeScript chooses an appropriate
  //  default.
  //
  const resolutionMode:
    | ts.ModuleKind.CommonJS
    | ts.ModuleKind.ESNext
    | undefined = undefined;

  const module = resolveModuleName(
    moduleName,
    containingFile,
    optionsWithSuffixes,
    context.host,
    cache,
    redirectedReference,
    resolutionMode
  );
  return module.resolvedModule;
}

/**
 * Resolve a set of modules for a TypeScript program, all referenced from a
 * single containing file. Prefer type (.d.ts) files and TypeScript source
 * (.ts[x]) files, as they usually carry more type information than JavaScript
 * source (.js[x]) files.
 * single containing file. When possible, delegate module resolution to TypeScript
 * itself, rather than using our custom resolver, as the TypeScript resolver
 * supports more scenarios than ours.
 *
 * When doing the module resolution ourselves, we prefer type (.d.ts) files and
 * TypeScript source (.ts[x]) files, as they usually carry more type information
 * than JavaScript source (.js[x]) files.
 *
 * @param context Resolver context
 * @param moduleNames List of module names, as they appear in each require/import statement
 * @param containingFile File from which the modules were all required/imported
 * @param _reusedNames
 * @param redirectedReference Head node in the program's graph of type references
 * @param options Compiler options to use when resolving this module
 * @param _containingSourceFile
 * @param typescript Used for _mocking_ only. This parameter must _always_ be last.
 * @returns Array of results. Each entry will have resolved module information, or will be `undefined` if resolution failed. The array will have one element for each entry in the module name list.
 */
export function resolveModuleNames(
  context: ResolverContext,
  moduleNames: string[],
  containingFile: string,
  _reusedNames: string[] | undefined,
  redirectedReference: ts.ResolvedProjectReference | undefined,
  options: ts.CompilerOptions,
  _containingSourceFile: ts.SourceFile | undefined,
  typescript = ts
): (ts.ResolvedModuleFull | undefined)[] {
  const { host, replaceReactNativePackageName } = context;
  const resolutions: (ts.ResolvedModuleFull | undefined)[] = [];

  const trace = options.traceResolution ? host.trace : undefined;

  for (const moduleName of moduleNames) {
    const finalModuleName = replaceReactNativePackageName(moduleName);
    if (finalModuleName !== moduleName && trace) {
      trace(`Substituting module '${moduleName}' with '${finalModuleName}'.`);
    }

    const module = resolveModuleName(
      context,
      finalModuleName,
      containingFile,
      redirectedReference,
      options,
      typescript
    );

    resolutions.push(module);
  }

  return resolutions;
}

/**
 * Resolve a set of type references for a TypeScript program.
 *
 * A type reference typically originates from a triple-slash directive:
 *
 *    `/// <reference path="...">`
 *    `/// <reference types="...">`
 *    `/// <reference lib="...">`
 *
 * Type references also come from the `compilerOptions.types` property in
 * `tsconfig.json`:
 *
 *    `types: ["node", "jest"]`
 *
 * @param context Resolver context
 * @param typeDirectiveNames List of type names, as they appear in each type reference directive
 * @param containingFile File from which the type names were all referenced
 * @param redirectedReference Head node in the program's graph of type references
 * @param options Compiler options
 * @param containingFileMode Indicates whether the containing file is an ESNext module or a CommonJS module
 * @param ts Used for _mocking_ only. This parameter must _always_ be last.
 * @returns Array of results. Each entry will have resolved type information, or will be `undefined` if resolution failed. The array will have one element for each entry in the type name list.
 */
export function resolveTypeReferenceDirectives(
  context: ResolverContext,
  typeDirectiveNames: string[] | readonly ts.FileReference[],
  containingFile: string,
  redirectedReference: ts.ResolvedProjectReference | undefined,
  options: ts.CompilerOptions,
  containingFileMode: ts.SourceFile["impliedNodeFormat"] | undefined,
  { resolveTypeReferenceDirective } = ts
): (ts.ResolvedTypeReferenceDirective | undefined)[] {
  const { host } = context;

  const resolutions: (ts.ResolvedTypeReferenceDirective | undefined)[] = [];

  for (const typeDirectiveName of typeDirectiveNames) {
    const name =
      typeof typeDirectiveName === "string"
        ? typeDirectiveName
        : typeDirectiveName.fileName.toLowerCase();

    //  Ensure the compiler options has `moduleSuffixes` set correctly for this RN project.
    const optionsWithSuffixes = getCompilerOptionsWithReactNativeModuleSuffixes(
      context,
      name,
      containingFile,
      options
    );

    //
    //  Invoke the built-in TypeScript type-reference resolver.
    //
    //  One of the params it takes is a resolution cache. We don't currently use this,
    //  and TypeScript can operate without it, though it may be slower. We have not done
    //  perf analysis to see how much of a benefit the cache provides.
    //
    //  If, down the road, we decide to add a cache, it should be created using:
    //
    //    `ts.createTypeReferenceDirectiveResolutionCache(currentDirectory, ...)`
    //
    //  And we should store each per-directory cache in a map, attached to `context`.
    //
    const cache: ts.TypeReferenceDirectiveResolutionCache | undefined =
      undefined;

    const { resolvedTypeReferenceDirective: directive } =
      resolveTypeReferenceDirective(
        name,
        containingFile,
        optionsWithSuffixes,
        host,
        redirectedReference,
        cache,
        containingFileMode
      );

    resolutions.push(directive);
  }
  return resolutions;
}
