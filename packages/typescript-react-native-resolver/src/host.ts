import {
  isFileModuleRef,
  isPackageModuleRef,
  parseModuleRef,
} from "@rnx-kit/tools-node";
import path from "path";
import ts from "typescript";

import { ExtensionsTypeScript, hasExtension } from "./extension";
import {
  ResolverLog,
  ResolverLogMode,
  changeModuleResolutionHostToLogFileSystemReads,
  logModuleBegin,
  logModuleEnd,
} from "./log";
import { createReactNativePackageNameReplacer } from "./react-native-package-name";
import { resolveFileModule, resolvePackageModule } from "./resolve";
import type { ResolverContext, ModuleResolutionHostLike } from "./types";

/**
 * Change the TypeScript `CompilerHost` implementation so it makes use of
 * react-native module resolution.
 *
 * This includes binding the `trace` method to a react-native trace logger.
 * The logger is active when the compiler option `traceResolution` is true, or
 * when react-native error tracing is enabled. All file and directory reads
 * are logged, making it easy to see what the resolver is doing.
 *
 * @param host Compiler host
 * @param options Compiler options
 * @param platform Target platform
 * @param platformExtensionNames Optional list of platform file extensions, from highest precedence (index 0) to lowest. Example: `["ios", "mobile", "native"]`.
 * @param disableReactNativePackageSubstitution Flag to prevent substituting the module name `react-native` with the target platform's out-of-tree NPM package implementation. For example, on Windows, devs expect `react-native` to implicitly refer to `react-native-windows`.
 * @param traceReactNativeModuleResolutionErrors Flag to enable trace logging when a resolver error occurs. All messages involved in the failed module resolution are aggregated and logged.
 * @param traceResolutionLog Optional file to use for logging trace message. When not present, log messages go to the console.
 */
export function changeCompilerHostToUseReactNativeResolver(
  host: ts.CompilerHost,
  options: ts.ParsedCommandLine["options"],
  platform: string,
  platformExtensionNames: string[] | undefined,
  disableReactNativePackageSubstitution: boolean,
  traceReactNativeModuleResolutionErrors: boolean,
  traceResolutionLog: string | undefined
): void {
  let mode = ResolverLogMode.Never;
  if (options.traceResolution) {
    mode = ResolverLogMode.Always;
  } else if (traceReactNativeModuleResolutionErrors) {
    mode = ResolverLogMode.OnFailure;
  }
  const log = new ResolverLog(mode, traceResolutionLog);
  host.trace = log.log.bind(log);

  // Ensure that optional methods have an implementation so they can be hooked
  // for logging.
  host.directoryExists = host.directoryExists ?? ts.sys.directoryExists;
  host.realpath = host.realpath ?? ts.sys.realpath;
  host.getDirectories = host.getDirectories ?? ts.sys.getDirectories;

  changeModuleResolutionHostToLogFileSystemReads(
    host as ModuleResolutionHostLike
  );

  const allowedExtensions = [...ExtensionsTypeScript];
  if (options.checkJs) {
    allowedExtensions.push(ts.Extension.Js, ts.Extension.Jsx);
  }
  if (options.resolveJsonModule) {
    allowedExtensions.push(ts.Extension.Json);
  }

  const context: ResolverContext = {
    host: host as ModuleResolutionHostLike,
    options,
    disableReactNativePackageSubstitution,
    log,
    platform,
    platformExtensions: [platform, ...(platformExtensionNames || [])].map(
      (e) => `.${e}` // prepend a '.' to each name to make it a file extension
    ),
    allowedExtensions,
    replaceReactNativePackageName: createReactNativePackageNameReplacer(
      platform,
      disableReactNativePackageSubstitution,
      log
    ),
  };

  host.resolveModuleNames = resolveModuleNames.bind(undefined, context);
  host.resolveTypeReferenceDirectives = resolveTypeReferenceDirectives.bind(
    undefined,
    context
  );
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
  extensions: ts.Extension[]
): ts.ResolvedModuleFull | undefined {
  let module: ts.ResolvedModuleFull | undefined = undefined;

  const moduleRef = parseModuleRef(moduleName);
  const searchDir = path.dirname(containingFile);
  if (isPackageModuleRef(moduleRef)) {
    module = resolvePackageModule(context, moduleRef, searchDir, extensions);
  } else if (isFileModuleRef(moduleRef)) {
    module = resolveFileModule(context, moduleRef, searchDir, extensions);
  }
  if (module) {
    module.isExternalLibraryImport = !!module.resolvedFileName.match(
      /[/\\]node_modules[/\\]/
    );

    const { host, options } = context;
    if (host.realpath && !options.preserveSymlinks) {
      const resolvedFileName = host.realpath(module.resolvedFileName);
      const originalPath =
        resolvedFileName === module.resolvedFileName
          ? undefined
          : module.resolvedFileName;
      Object.assign({}, module, { resolvedFileName, originalPath });
    }
  }

  return module;
}

/**
 * Resolve a set of modules for a TypeScript program, all referenced from a
 * single containing file. Prefer type (.d.ts) files and TypeScript source
 * (.ts[x]) files, as they usually carry more type information than JavaScript
 * source (.js[x]) files.
 *
 * @param context Resolver context
 * @param moduleNames List of module names, as they appear in each require/import statement
 * @param containingFile File from which the modules were all required/imported
 * @param extensions List of allowed file extensions to use when resolving each module to a file
 * @returns Array of results. Each entry will have resolved module information, or will be `undefined` if resolution failed. The array will have one element for each entry in the module name list.
 */
export function resolveModuleNames(
  context: ResolverContext,
  moduleNames: string[],
  containingFile: string,
  _reusedNames: string[] | undefined,
  _redirectedReference?: ts.ResolvedProjectReference
): (ts.ResolvedModuleFull | undefined)[] {
  const { options, log, allowedExtensions, replaceReactNativePackageName } =
    context;

  //
  //  If the containing file is a type file (.d.ts), it can only import
  //  other type files. Search for both .d.ts and .ts files, as some
  //  modules import as "foo.d" with the intent to resolve to "foo.d.ts".
  //
  const extensions = hasExtension(containingFile, ts.Extension.Dts)
    ? [ts.Extension.Dts, ts.Extension.Ts]
    : allowedExtensions;

  const resolutions: (ts.ResolvedModuleFull | undefined)[] = [];

  for (const moduleName of moduleNames) {
    logModuleBegin(log, moduleName, containingFile);

    const module = resolveModuleName(
      context,
      replaceReactNativePackageName(moduleName),
      containingFile,
      extensions
    );

    resolutions.push(module);
    logModuleEnd(log, options, moduleName, module);
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
 * @returns Array of results. Each entry will have resolved type information, or will be `undefined` if resolution failed. The array will have one element for each entry in the type name list.
 */
export function resolveTypeReferenceDirectives(
  context: ResolverContext,
  typeDirectiveNames: string[],
  containingFile: string,
  redirectedReference?: ts.ResolvedProjectReference
): (ts.ResolvedTypeReferenceDirective | undefined)[] {
  const { host, options, log } = context;

  const resolutions: (ts.ResolvedTypeReferenceDirective | undefined)[] = [];

  for (const typeDirectiveName of typeDirectiveNames) {
    // TypeScript only emits trace messages when traceResolution is enabled.
    // Our code, however, can emit even when traceResolution is disabled. We
    // have the "emit only errors" mode. This includes the file-system reads
    // we hooked on the module-resolution host.
    //
    // We don't want to see those file-system read messages without the
    // larger context of TypeScript's trace messages. So, for type directives,
    // we can only log successes AND failures when traceResolution is enabled.
    //
    if (options.traceResolution) {
      log.begin();
    }

    const { resolvedTypeReferenceDirective: directive } =
      ts.resolveTypeReferenceDirective(
        typeDirectiveName,
        containingFile,
        options,
        host,
        redirectedReference
      );

    resolutions.push(directive);
    if (options.traceResolution) {
      if (directive) {
        log.endSuccess();
      } else {
        log.endFailure();
      }
    }
  }

  return resolutions;
}
