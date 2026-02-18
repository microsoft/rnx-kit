import * as path from "node:path";
import type { PackageRef } from "./package.ts";
import {
  destructureModuleRef,
  findPackageDir,
  mergeModulePaths,
  parsePackageRef,
  readPackage,
} from "./package.ts";

/**
 * Module reference relative to a package, such as `react-native` or
 * `@rnx-kit/tools/node/index`.
 */
export type PackageModuleRef = PackageRef & {
  path?: string;
};

/**
 * Module reference rooted to a file system location, either relative
 * to a directory, or as an absolute path. For example, `./index` or
 * `/repos/rnx-kit/packages/tools/src/index`.
 */
export type FileModuleRef = {
  path: string;
};

/**
 * Parse a module reference into either a package module reference or a file
 * module reference. If there are any sub-paths, they are returned in paths.
 *
 * @param r Module reference
 * @return Module components
 */
export function parseModuleRef(r: string): PackageModuleRef | FileModuleRef {
  if (r.startsWith(".") || path.isAbsolute(r)) {
    return {
      path: r,
    };
  }

  return destructureModuleRef(r);
}

/**
 * Is the module reference a package module reference?
 *
 * @param r Module reference
 * @returns `true` if the module reference is based on a package
 */
export function isPackageModuleRef(
  r: PackageModuleRef | FileModuleRef
): r is PackageModuleRef {
  return "name" in r;
}

/**
 * Is the module reference relative to a file location?
 *
 * @param r Module reference
 * @returns `true` if the module reference is based on a file location
 */
export function isFileModuleRef(
  r: PackageModuleRef | FileModuleRef
): r is FileModuleRef {
  return !isPackageModuleRef(r);
}

/**
 * Convert a module path to a package module reference.
 *
 * Find the module's `package.json` file, read the package name/scope, and
 * assemble that along with the module's path into a complete reference.
 *
 * @param modulePath Path to the module. Must be within a package.
 * @returns A package module reference, or `undefined` on failure
 */
export function getPackageModuleRefFromModulePath(
  modulePath: string
): PackageModuleRef | undefined {
  const pkgDir = findPackageDir(modulePath);
  if (pkgDir) {
    const manifest = readPackage(pkgDir);

    const ref: PackageModuleRef = parsePackageRef(manifest.name);
    ref.path = path.relative(pkgDir, modulePath);
    return ref;
  }

  return undefined;
}

/**
 * This is a helper to resolve a module path to an absolute file system path. Note that it behaves differently
 * than a normal require.resolve in a few key ways.
 * - if no sub-path is attached, it will return the root directory of the package, not the main entry point
 * - if a sub-path is attached, it will resolve that path manually with respect to the package directory.
 * - this means that the references files should include extensions and will be handled literally.
 * - the references path within the package may not exist, but it will be contained in the package directory
 *
 * In essence:
 * - it uses module resolution to find the package root directory
 * - it uses path joining to resolve the final path
 *
 * This can be used as a quick helper to find package root directories, or to emulate behaviors such as typescript's
 * tsconfig extends resolution.
 *
 * @param modulePath package-name[/sub-path] style module reference or relative file path to resolve
 * @param baseDir optional base directory to resolve from, defaults to process.cwd()
 * @returns Resolved absolute file path, or throws if resolution fails
 */
export function resolveModulePathDirect(
  modulePath: string,
  baseDir?: string
): string {
  baseDir ??= process.cwd();
  // resolve relative paths with respect to the baseDir using standard node path resolution
  if (modulePath.startsWith(".")) {
    return path.resolve(baseDir, modulePath);
  }
  // for module references, parse the path into its component parts
  const { scope, name, path: subModulePath } = destructureModuleRef(modulePath);

  // resolve the path for the package.json file for this module reference, which will throw if it cannot be found
  const pkgRef = mergeModulePaths(scope, name, "package.json");
  const pkgPath = require.resolve(pkgRef, { paths: [baseDir] });

  // resolve the package directory using require.resolve, which will use node's module resolution algorithm
  const pkgDir = path.dirname(pkgPath);

  // now return the resolved path to the module, including sub-module path if it was specified
  return subModulePath
    ? path.join(pkgDir, subModulePath)
    : path.normalize(pkgDir);
}
