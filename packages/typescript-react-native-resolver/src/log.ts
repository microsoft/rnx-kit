import ts from "typescript";

import type { ModuleResolutionHostLike } from "./types";

/**
 * Mark the start of a module resolution in the log.
 *
 * @param host Module resolution host
 * @param moduleName Module name
 * @param containingFile File from which the module was required/imported.
 */
export function logModuleBegin(
  host: ModuleResolutionHostLike,
  moduleName: string,
  containingFile: string
): void {
  host.trace(
    `======== Resolving module '${moduleName}' from '${containingFile}' ========`
  );
}

/**
 * Mark the end of a module resolution in the log.
 *
 * @param host Module resolution host
 * @param moduleName Module name
 * @param module Module resolution info, or `undefined` if resolution failed.
 */
export function logModuleEnd(
  host: ModuleResolutionHostLike,
  moduleName: string,
  module: ts.ResolvedModuleFull | undefined
): void {
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
