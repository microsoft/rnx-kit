import ts from "typescript";

import type { ModuleResolutionHostLike } from "./types";

/**
 * See if module resolution tracing is enabled.
 *
 * @param host Module resolution host
 * @param compilerOptions Compiler options
 * @returns `true` if tracing is enabled, `false` otherwise.
 */
export function isTraceEnabled(
  host: ModuleResolutionHostLike,
  compilerOptions: ts.CompilerOptions
) {
  return !!compilerOptions.traceResolution && host.trace !== undefined;
}

/**
 * Mark the start of a module resolution in the log.
 *
 * @param host Module resolution host
 * @param options Compiler options
 * @param moduleName Module name
 * @param containingFile File from which the module was required/imported.
 */
export function logModuleBegin(
  host: ModuleResolutionHostLike,
  options: ts.CompilerOptions,
  moduleName: string,
  containingFile: string
): void {
  if (isTraceEnabled(host, options)) {
    host.trace(
      `======== Resolving module '${moduleName}' from '${containingFile}' ========`
    );
  }
}

/**
 * Mark the end of a module resolution in the log.
 *
 * @param host Module resolution host
 * @param options Compiler options
 * @param moduleName Module name
 * @param module Module resolution info, or `undefined` if resolution failed.
 */
export function logModuleEnd(
  host: ModuleResolutionHostLike,
  options: ts.CompilerOptions,
  moduleName: string,
  module: ts.ResolvedModuleFull | undefined
): void {
  if (isTraceEnabled(host, options)) {
    if (module) {
      host.trace(
        `File '${module.resolvedFileName}' exists - using it as a module resolution result.`
      );
      host.trace(
        `======== Module name '${moduleName}' was successfully resolved to '${module.resolvedFileName}' ========`
      );
    } else {
      host.trace(`Failed to resolve module ${moduleName} to a file.`);
      host.trace(
        `======== Module name '${moduleName}' failed to resolve to a file ========`
      );
    }
  }
}
