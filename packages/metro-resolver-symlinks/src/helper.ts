import { findPackageDependencyDir } from "@rnx-kit/tools-node/package";
import { findMetroPath } from "@rnx-kit/tools-react-native/metro";

export function resolveFrom(
  moduleName: string,
  startDir: string
): string | undefined {
  return findPackageDependencyDir(moduleName, {
    startDir,
    resolveSymlinks: true,
  });
}

/**
 * Imports specified module starting from the installation directory of the
 * currently used `metro` version.
 *
 * @todo Currently not possible to do `R = type import(Module)`:
 *       https://github.com/microsoft/TypeScript/issues/44636
 */
export function requireModuleFromMetro<R = unknown>(
  moduleName: string,
  fromDir = process.cwd()
): R {
  const startDir = findMetroPath(fromDir);
  if (!startDir) {
    throw new Error("Cannot find module 'metro'");
  }

  const modulePath = resolveFrom(moduleName, startDir);
  if (!modulePath) {
    throw new Error(
      `Cannot find module '${moduleName}'. This probably means that ` +
        "'@rnx-kit/metro-resolver-symlinks' is not compatible with the " +
        "version of 'metro' that you are currently using. Please update to " +
        "the latest version and try again. If the issue still persists after " +
        "the update, please file a bug at " +
        "https://github.com/microsoft/rnx-kit/issues."
    );
  }

  return require(modulePath);
}
