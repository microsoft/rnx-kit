import {
  isFileModuleRef,
  isPackageModuleRef,
  parseModuleRef,
} from "@rnx-kit/tools-node";
import intersection from "lodash/intersection";
import isEqual from "lodash/isEqual";
import path from "path";
import semverSatisfies from "semver/functions/satisfies";
import ts from "typescript";

import {
  ExtensionsJavaScript,
  ExtensionsJSON,
  ExtensionsTypeScript,
} from "./extension";
import { isTraceEnabled, logModuleBegin, logModuleEnd } from "./log";
import { createReactNativePackageNameReplacer } from "./react-native-package-name";
import { resolveFileModule, resolvePackageModule } from "./resolve";

import type { ResolverContext, ModuleResolutionHostLike } from "./types";

/**
 * Change the TypeScript `CompilerHost` or `LanguageServiceHost` so it makes
 * use of react-native module resolution.
 *
 * @param host Compiler host or language service host
 * @param platform Target platform
 * @param platformExtensionNames List of platform file extensions, from highest precedence (index 0) to lowest. Example: `["ios", "mobile", "native"]`.
 * @param disableReactNativePackageSubstitution Flag to prevent substituting the module name `react-native` with the target platform's out-of-tree NPM package implementation. For example, on Windows, devs expect `react-native` to implicitly refer to `react-native-windows`.
 */
export function changeHostToUseReactNativeResolver({
  host,
  platform,
  platformExtensionNames,
  disableReactNativePackageSubstitution,
}: {
  host: ts.CompilerHost | ts.LanguageServiceHost;
  platform: string;
  platformExtensionNames: string[];
  disableReactNativePackageSubstitution: boolean;
}): void {
  // Ensure that optional methods have an implementation so they can be hooked
  // for logging, and so we can use them in the resolver.
  host.directoryExists = host.directoryExists ?? ts.sys.directoryExists;
  host.realpath = host.realpath ?? ts.sys.realpath;
  host.getDirectories = host.getDirectories ?? ts.sys.getDirectories;

  const context: ResolverContext = {
    host: host as ModuleResolutionHostLike,
    disableReactNativePackageSubstitution,
    platform,
    platformExtensions: platformExtensionNames.map(
      (e) => `.${e}` // prepend a '.' to each name to make it a file extension
    ),
    replaceReactNativePackageName: createReactNativePackageNameReplacer(
      host.getCurrentDirectory(),
      platform,
      disableReactNativePackageSubstitution
    ),
  };

  host.resolveModuleNames = resolveModuleNames.bind(undefined, context);
  host.resolveTypeReferenceDirectives = resolveTypeReferenceDirectives.bind(
    undefined,
    context
  );
}

/**
 * Starting with TypeScript 4.7, a new compiler option named `moduleSuffixes` is
 * available. We can use this to configure the built-in TypeScript module resolver
 * for React Native projects. Using the TS resolver, rather than our own, is best
 * because it is actively maintained, up-to-date with changes in the node ecosystem,
 * and supports more scenarios such as path remapping (baseUrl, paths, rootDir).
 *
 * @returns `true` if TypeScript supports the `moduleSuffixes` compiler option. `false`, otherwise.
 */
export function doesTypeScriptSupportModuleSuffixes(): boolean {
  return semverSatisfies(ts.version, ">=4.7.0");
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
      moduleSuffixes: [...context.platformExtensions],
    };
  }

  //  `moduleSuffixes` is already defined in the module's compiler options.
  //  We cannot safely modify it because we don't know how to order the entries
  //  when adding those needed for React Native. Ordering matters because it controls
  //  file selection. e.g. If "ios" comes before "native", then "foo.ios.ts" will be
  //  resolved ahead of "foo.native.ts".
  //
  //  The best we can do is check `moduleSuffixes` to see if the React Native entries
  //  we need are already there, in order. If not, we have to fail.

  const suffixesIntersection = intersection(
    options.moduleSuffixes,
    context.platformExtensions
  );
  const neededSuffixesAlreadyPresent = isEqual(
    suffixesIntersection,
    context.platformExtensions
  );
  if (!neededSuffixesAlreadyPresent) {
    const currentSuffixes = options.moduleSuffixes.join(",");
    const neededSuffixes = context.platformExtensions.join(",");
    throw new Error(
      `Failed to resolve module reference '${moduleName}' in source file '${containingFile}.\n` +
        `The parent package has a TypeScript configuration which sets 'moduleSuffixes' to '${currentSuffixes}'.\n` +
        `This is incompatible with the target platform '${context.platform}', which requires 'moduleSuffixes' to contain at least '${neededSuffixes}', in that order.\n` +
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
 * @param options Compiler options for the module.
 * @param redirectedReference
 * @returns
 */
export function resolveModuleNameUsingModuleSuffixes(
  context: ResolverContext,
  moduleName: string,
  containingFile: string,
  options: ts.CompilerOptions,
  redirectedReference?: ts.ResolvedProjectReference
): ts.ResolvedModuleFull | undefined {
  //  Ensure the compiler options has `moduleSuffixes` set correctly for this RN project.
  const optionsWithSuffixes = getCompilerOptionsWithReactNativeModuleSuffixes(
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
  //  It is optional, and we leave it undefined, so that TypeScript chooses an apprporiate
  //  default.
  //
  const resolutionMode:
    | ts.ModuleKind.CommonJS
    | ts.ModuleKind.ESNext
    | undefined = undefined;

  const module = ts.resolveModuleName(
    moduleName,
    containingFile,
    optionsWithSuffixes,
    context.host,
    cache,
    redirectedReference,
    resolutionMode
  ).resolvedModule;

  return module;
}

/**
 * Resolve a module for a TypeScript program. Prefer type (.d.ts) files and
 * TypeScript source (.ts[x]) files, as they usually carry more type
 * information than JavaScript source (.js[x]) files.
 *
 * @param context Resolver context
 * @param moduleName Module name, as listed in the require/import statement
 * @param containingFile File from which the module was required/imported
 * @param extensions List of allowed file extensions to use when resolving the module to a file
 * @returns Resolved module information, or `undefined` if resolution failed.
 */
export function resolveModuleName(
  context: ResolverContext,
  moduleName: string,
  containingFile: string,
  options: ts.CompilerOptions,
  extensions: ts.Extension[]
): ts.ResolvedModuleFull | undefined {
  let module: ts.ResolvedModuleFull | undefined = undefined;

  const moduleRef = parseModuleRef(moduleName);
  const searchDir = path.dirname(containingFile);
  if (isPackageModuleRef(moduleRef)) {
    module = resolvePackageModule(
      context,
      options,
      moduleRef,
      searchDir,
      extensions
    );
  } else if (isFileModuleRef(moduleRef)) {
    module = resolveFileModule(
      context,
      options,
      moduleRef,
      searchDir,
      extensions
    );
  }
  if (module) {
    module.isExternalLibraryImport = /[/\\]node_modules[/\\]/.test(
      module.resolvedFileName
    );

    const { host } = context;
    if (host.realpath && !options.preserveSymlinks) {
      const resolvedFileName = host.realpath(module.resolvedFileName);
      const originalPath =
        resolvedFileName === module.resolvedFileName
          ? undefined
          : module.resolvedFileName;
      Object.assign(module, { resolvedFileName, originalPath });
    }
  }

  return module;
}

/**
 * Resolve a set of modules for a TypeScript program, all referenced from a
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
 * @param _redirectedReference Head node in the program's graph of type references
 * @param options Compiler options to use when resolving this module
 * @param _containingSourceFile
 * @returns Array of results. Each entry will have resolved module information, or will be `undefined` if resolution failed. The array will have one element for each entry in the module name list.
 */
export function resolveModuleNames(
  context: ResolverContext,
  moduleNames: string[],
  containingFile: string,
  _reusedNames: string[] | undefined,
  redirectedReference: ts.ResolvedProjectReference | undefined,
  options: ts.CompilerOptions,
  _containingSourceFile: ts.SourceFile | undefined
): (ts.ResolvedModuleFull | undefined)[] {
  const { host, replaceReactNativePackageName } = context;
  const resolutions: (ts.ResolvedModuleFull | undefined)[] = [];

  const traceEnabled = isTraceEnabled(host, options);

  for (const moduleName of moduleNames) {
    logModuleBegin(host, options, moduleName, containingFile);

    const finalModuleName = replaceReactNativePackageName(moduleName);
    if (finalModuleName !== moduleName && traceEnabled) {
      host.trace(
        `Substituting module '${moduleName}' with '${finalModuleName}'.`
      );
    }

    let module: ts.ResolvedModuleFull | undefined = undefined;
    if (doesTypeScriptSupportModuleSuffixes()) {
      module = resolveModuleNameUsingModuleSuffixes(
        context,
        finalModuleName,
        containingFile,
        options,
        redirectedReference
      );
    } else {
      //  We're using an older version of TypeScript which doesn't support
      //  `moduleSuffixes`, which means we need to use our custom resolver.
      //
      //  Our resolver doesn't support TypeScript's path remapping features.
      //  This can be confusing/misleading, so print an explicit error message
      //  here if they are being used. This gives developers a clear signal
      //  that there is a problem, and tells them how to proceed.
      //
      const { baseUrl, paths, rootDirs } = options;
      if (baseUrl || paths || rootDirs) {
        throw new Error(
          "@rnx-kit/cli has TypeScript validation enabled, and has detected that tsconfig.json " +
            "is using at least one of 'paths', 'baseURL', or 'rootDirs'. " +
            "The CLI only supports these options with TypeScript 4.7 or later. " +
            "Please upgrade TypeScript, turn off CLI TypeScript validation, or remove these tsconfig.json options."
        );
      }

      //  First, try to resolve the module to a TypeScript file. Then, fall back
      //  to looking for a JavaScript file. Finally, if JSON modules are allowed,
      //  try resolving to one of them.
      if (traceEnabled) {
        host.trace(
          `Searching for module '${finalModuleName}' with target file type 'TypeScript'`
        );
      }
      module = resolveModuleName(
        context,
        finalModuleName,
        containingFile,
        options,
        ExtensionsTypeScript
      );
      if (!module) {
        if (traceEnabled) {
          host.trace(
            `Searching for module '${finalModuleName}' with target file type 'JavaScript'`
          );
        }
        module = resolveModuleName(
          context,
          finalModuleName,
          containingFile,
          options,
          ExtensionsJavaScript
        );
        if (!module && options.resolveJsonModule) {
          if (traceEnabled) {
            host.trace(
              `Searching for module '${finalModuleName}' with target file type 'JSON'`
            );
          }
          module = resolveModuleName(
            context,
            finalModuleName,
            containingFile,
            options,
            ExtensionsJSON
          );
        }
      }
    }

    resolutions.push(module);
    logModuleEnd(host, options, moduleName, module);
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
 * @returns Array of results. Each entry will have resolved type information, or will be `undefined` if resolution failed. The array will have one element for each entry in the type name list.
 */
export function resolveTypeReferenceDirectives(
  context: ResolverContext,
  typeDirectiveNames: string[] | readonly ts.FileReference[],
  containingFile: string,
  redirectedReference: ts.ResolvedProjectReference | undefined,
  options: ts.CompilerOptions,
  containingFileMode: ts.SourceFile["impliedNodeFormat"] | undefined
): (ts.ResolvedTypeReferenceDirective | undefined)[] {
  const { host } = context;

  const resolutions: (ts.ResolvedTypeReferenceDirective | undefined)[] = [];

  for (const typeDirectiveName of typeDirectiveNames) {
    const name =
      typeof typeDirectiveName === "string"
        ? typeDirectiveName
        : typeDirectiveName.fileName.toLowerCase();

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
      ts.resolveTypeReferenceDirective(
        name,
        containingFile,
        options,
        host,
        redirectedReference,
        cache,
        containingFileMode
      );

    resolutions.push(directive);
  }

  return resolutions;
}
