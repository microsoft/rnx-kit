import { warn } from "@rnx-kit/console";
import { findPackage, readPackage } from "@rnx-kit/tools-node/package";
import type { BuildOptions } from "esbuild";
import type { Module, ReadOnlyDependencies } from "metro";
import * as path from "path";
import { generateSourceMappingURL } from "./sourceMap";

export function getModulePath(
  moduleName: string,
  parent: Module
): string | undefined {
  const p = parent.dependencies.get(moduleName)?.absolutePath;
  if (p) {
    return p;
  }

  // In Metro 0.72.0, the key changed from module name to a unique key in order
  // to support features such as `require.context`. For more details, see
  // https://github.com/facebook/metro/commit/52e1a00ffb124914a95e78e9f60df1bc2e2e7bf0.
  for (const [, value] of parent.dependencies) {
    if (value.data.name === moduleName) {
      return value.absolutePath;
    }
  }

  return undefined;
}

/**
 * Returns whether the specified module has any side effects.
 *
 * For details on how this field works, please see
 * https://webpack.js.org/guides/tree-shaking/.
 *
 * @param modulePath Absolute path to a module
 * @returns Whether the specified module has any side effects.
 */
export const getSideEffects = (() => {
  const pkgCache: Record<string, boolean | string[] | undefined> = {};
  const getSideEffectsFromCache = (pkgJson: string) => {
    if (!(pkgJson in pkgCache)) {
      const { sideEffects } = readPackage(pkgJson);
      if (Array.isArray(sideEffects)) {
        const fg = require("fast-glob");
        pkgCache[pkgJson] = fg
          .sync(sideEffects, {
            cwd: path.dirname(pkgJson),
            absolute: true,
          })
          .map((p: string) => p.replace(/[/\\]/g, path.sep));
      } else if (typeof sideEffects === "boolean") {
        pkgCache[pkgJson] = sideEffects;
      } else {
        pkgCache[pkgJson] = undefined;
      }
    }
    return pkgCache[pkgJson];
  };
  return (modulePath: string): boolean | undefined => {
    const pkgJson = findPackage(modulePath);
    if (!pkgJson) {
      return undefined;
    }

    const sideEffects = getSideEffectsFromCache(pkgJson);
    return Array.isArray(sideEffects)
      ? sideEffects.includes(modulePath)
      : sideEffects;
  };
})();

export function isImporting(
  moduleName: string,
  dependencies: ReadOnlyDependencies
): boolean {
  const iterator = dependencies.keys();
  for (let key = iterator.next(); !key.done; key = iterator.next()) {
    if (key.value.includes(moduleName)) {
      return true;
    }
  }
  return false;
}

export function outputOf(
  module: Module | undefined,
  logLevel: BuildOptions["logLevel"]
): string | undefined {
  if (!module) {
    return undefined;
  }

  const jsModules = module.output.filter(({ type }) => type.startsWith("js/"));
  if (jsModules.length !== 1) {
    throw new Error(
      `Modules must have exactly one JS output, but ${module.path} has ${jsModules.length}`
    );
  }

  const code = jsModules[0].data.code;
  const moduleWithModuleNameOnly = {
    ...module,
    // esbuild only needs the base file name. It derives the path from the
    // imported path, and appends the file name to it. If we don't trim the path
    // here, we will end up with "double" paths, e.g.
    // `src/Users/<user>/Source/rnx-kit/packages/test-app/src/App.native.tsx`.
    path: path.basename(module.path),
  };

  if (logLevel === "debug" && code.includes("export * from")) {
    const modulePath = path.relative(process.cwd(), module.path);
    warn(`Found uses of 'export *' in ${modulePath}`);
  }

  return `${code}\n${generateSourceMappingURL([moduleWithModuleNameOnly])}\n`;
}
