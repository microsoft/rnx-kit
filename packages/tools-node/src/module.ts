import path from "path";
import type { PackageRef } from "./package";
import {
  destructureModuleRef,
  findPackageDir,
  parsePackageRef,
  readPackage,
} from "./package";

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
 * module reference. If there are any sub-modules, they are trimmed.
 *
 * For module references:
 * - '@scope/package' -> { scope: '@scope', name: 'package' }
 * - '@scope/package/index' -> { scope: '@scope', name: 'package' }, /index is stripped
 * For file references:
 * - './index' -> { path: './index' }
 *
 * @param moduleRef Module reference
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
