import { parseModuleRef } from "@rnx-kit/tools-node";
import ts from "typescript";
import type { ResolverContext } from "./types";

function isPackageRef(name: string): boolean {
  return !parseModuleRef(name).path;
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
): ts.ResolvedModuleWithFailedLookupLocations {
  // Ensure the compiler options has `moduleSuffixes` set correctly for this RN
  // project. If `moduleName` points to a package (no paths), don't add platform
  // suffixes as they are not used when looking at main fields.
  const optionsWithSuffixes = isPackageRef(moduleName)
    ? options
    : { ...options, moduleSuffixes: context.platformFileExtensions };

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

  return resolveModuleName(
    moduleName,
    containingFile,
    optionsWithSuffixes,
    context.host,
    cache,
    redirectedReference,
    resolutionMode
  );
}

/**
 * Resolve a set of modules for a TypeScript program, all referenced from a
 * single containing file. When possible, delegate module resolution to
 * TypeScript itself, rather than using our custom resolver, as the TypeScript
 * resolver supports more scenarios than ours.
 *
 * When doing the module resolution ourselves, we prefer type (.d.ts) files and
 * TypeScript source (.ts[x]) files, as they usually carry more type information
 * than JavaScript source (.js[x]) files.
 *
 * @param context Resolver context
 * @param moduleLiterals List of module names, as they appear in each require/import statement
 * @param containingFile File from which the modules were all required/imported
 * @param redirectedReference Head node in the program's graph of type references
 * @param options Compiler options to use when resolving this module
 * @param _containingSourceFile
 * @param _reusedNames
 * @param typescript Used for _mocking_ only. This parameter must _always_ be last.
 * @returns Array of results. Each entry will have resolved module information, or will be `undefined` if resolution failed. The array will have one element for each entry in the module name list.
 */
export function resolveModuleNameLiterals(
  context: ResolverContext,
  moduleLiterals: readonly ts.StringLiteralLike[],
  containingFile: string,
  redirectedReference: ts.ResolvedProjectReference | undefined,
  options: ts.CompilerOptions,
  _containingSourceFile: ts.SourceFile,
  _reusedNames: readonly ts.StringLiteralLike[] | undefined,
  typescript = ts
): readonly ts.ResolvedModuleWithFailedLookupLocations[] {
  const { host, replaceReactNativePackageName } = context;
  const resolutions: ts.ResolvedModuleWithFailedLookupLocations[] = [];

  const trace = options.traceResolution ? host.trace : undefined;

  for (const moduleLiteral of moduleLiterals) {
    const moduleName = moduleLiteral.text;
    const finalModuleName = replaceReactNativePackageName(moduleName);
    if (trace && finalModuleName !== moduleName) {
      trace(`Substituting module '${moduleName}' with '${finalModuleName}'.`);
    }

    const resolvedModule = resolveModuleName(
      context,
      finalModuleName,
      containingFile,
      redirectedReference,
      options,
      typescript
    );

    resolutions.push(resolvedModule);
  }

  return resolutions;
}

// TODO: Remove when we drop support for TypeScript 4.
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

    const { resolvedModule } = resolveModuleName(
      context,
      finalModuleName,
      containingFile,
      redirectedReference,
      options,
      typescript
    );

    resolutions.push(resolvedModule);
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
 * @param typeDirectiveReferences List of type names, as they appear in each type reference directive
 * @param containingFile File from which the type names were all referenced
 * @param redirectedReference Head node in the program's graph of type references
 * @param options Compiler options
 * @param containingSourceFile The containing source file
 * @param _reusedNames
 * @param ts Used for _mocking_ only. This parameter must _always_ be last.
 * @returns Array of results. Each entry will have resolved type information, or will be `undefined` if resolution failed. The array will have one element for each entry in the type name list.
 */
export function resolveTypeReferenceDirectiveReferences<
  T extends ts.FileReference | string,
>(
  { host, platformFileExtensions: moduleSuffixes }: ResolverContext,
  typeDirectiveReferences: readonly T[],
  containingFile: string,
  redirectedReference: ts.ResolvedProjectReference | undefined,
  options: ts.CompilerOptions,
  containingSourceFile: ts.SourceFile | undefined,
  _reusedNames: readonly T[] | undefined,
  { resolveTypeReferenceDirective } = ts
): readonly ts.ResolvedTypeReferenceDirectiveWithFailedLookupLocations[] {
  const resolutions: ts.ResolvedTypeReferenceDirectiveWithFailedLookupLocations[] =
    [];

  // Ensure the compiler options has `moduleSuffixes` set correctly for this
  // React Native project.
  const optionsWithSuffixes = { ...options, moduleSuffixes };

  for (const ref of typeDirectiveReferences) {
    const name = typeof ref === "string" ? ref : ref.fileName.toLowerCase();

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

    const directive = resolveTypeReferenceDirective(
      name,
      containingFile,
      optionsWithSuffixes,
      host,
      redirectedReference,
      cache,
      containingSourceFile?.impliedNodeFormat
    );

    resolutions.push(directive);
  }

  return resolutions;
}

// TODO: Remove when we drop support for TypeScript 4.
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
    const optionsWithSuffixes = {
      ...options,
      moduleSuffixes: context.platformFileExtensions,
    };

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
