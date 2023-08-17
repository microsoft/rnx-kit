import {
  findPackageDependencyDir,
  readPackage,
} from "@rnx-kit/tools-node/package";

function resolveFrom(name: string, startDir: string): string | undefined {
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
  const rnDir = resolveFrom("react-native", projectRoot);
  if (!rnDir) {
    return undefined;
  }

  // `metro` dependency was moved to `@react-native/community-cli-plugin` in 0.73
  // https://github.com/facebook/react-native/commit/fdcb94ad1310af6613cfb2a2c3f22f200bfa1c86
  const cliPluginDir = resolveFrom("@react-native/community-cli-plugin", rnDir);
  if (cliPluginDir) {
    return resolveFrom("metro", cliPluginDir);
  }

  const cliDir = resolveFrom("@react-native-community/cli", rnDir);
  if (!cliDir) {
    return undefined;
  }

  const cliMetroDir = resolveFrom(
    "@react-native-community/cli-plugin-metro",
    cliDir
  );
  return resolveFrom("metro", cliMetroDir || cliDir);
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
