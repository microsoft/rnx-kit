import { findPackageDependencyDir, readPackage } from "@rnx-kit/tools-node";

export function resolveFrom(
  moduleName: string,
  startDir: string
): string | undefined {
  return findPackageDependencyDir(moduleName, {
    startDir,
    resolveSymlinks: true,
  });
}

export function ensureResolveFrom(
  moduleName: string,
  startDir: string
): string {
  const p = resolveFrom(moduleName, startDir);
  if (!p) {
    throw new Error(`Cannot find module '${moduleName}'`);
  }
  return p;
}

/**
 * Returns the directory in which `metro` and its dependencies were installed.
 * @param fromDir The directory to start searching from
 */
export function getMetroSearchPath(fromDir = process.cwd()): string {
  const rnPath = ensureResolveFrom("react-native", fromDir);
  const rncliPath = ensureResolveFrom("@react-native-community/cli", rnPath);

  const { dependencies = {} } = readPackage(rncliPath);
  return "@react-native-community/cli-plugin-metro" in dependencies
    ? ensureResolveFrom("@react-native-community/cli-plugin-metro", rncliPath)
    : rncliPath;
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
  try {
    const startDir = getMetroSearchPath(fromDir);
    const metroModulePath = ensureResolveFrom(moduleName, startDir);
    return require(metroModulePath);
  } catch (_) {
    throw new Error(
      `Cannot find module '${moduleName}'. This probably means that '@rnx-kit/metro-resolver-symlinks' is not compatible with the version of 'metro' that you are currently using. Please update to the latest version and try again. If the issue still persists after the update, please file a bug at https://github.com/microsoft/rnx-kit/issues.`
    );
  }
}
