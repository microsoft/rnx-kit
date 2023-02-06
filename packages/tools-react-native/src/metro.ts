import {
  findPackageDependencyDir,
  readPackage,
} from "@rnx-kit/tools-node/package";

function resolveDependency(name: string, startDir: string): string | undefined {
  return findPackageDependencyDir(name, {
    startDir,
    resolveSymlinks: true,
  });
}

/**
 * Finds the installation path of Metro.
 * @param projectRoot The root of the project; defaults to the current working directory
 * @returns The path to the Metro installation; `undefined` if Metro could not be found
 */
export function findMetroPath(projectRoot = process.cwd()): string | undefined {
  const rnPath = resolveDependency("react-native", projectRoot);
  if (!rnPath) {
    return undefined;
  }

  const cliPath = resolveDependency("@react-native-community/cli", rnPath);
  if (!cliPath) {
    return undefined;
  }

  const cliMetroPath = resolveDependency(
    "@react-native-community/cli-plugin-metro",
    cliPath
  );
  return resolveDependency("metro", cliMetroPath || cliPath);
}

/**
 * Returns Metro version number.
 * @param projectRoot The root of the project; defaults to the current working directory
 * @returns Metro version number; `undefined` if Metro could not be found
 */
export function getMetroVersion(
  projectRoot = process.cwd()
): string | undefined {
  const metroPath = findMetroPath(projectRoot);
  if (!metroPath) {
    return undefined;
  }

  const { version } = readPackage(metroPath);
  return version;
}
