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
  const rnPath = resolveFrom("react-native", projectRoot);
  if (!rnPath) {
    return undefined;
  }

  // `metro` dependency was moved to `@react-native/community-cli-plugin` in 0.73
  // https://github.com/facebook/react-native/commit/fdcb94ad1310af6613cfb2a2c3f22f200bfa1c86
  const cliPlugin = resolveFrom("@react-native/community-cli-plugin", rnPath);
  if (cliPlugin) {
    return resolveFrom("metro", cliPlugin);
  }

  const cliPath = resolveFrom("@react-native-community/cli", rnPath);
  if (!cliPath) {
    return undefined;
  }

  const cliMetroPath = resolveFrom(
    "@react-native-community/cli-plugin-metro",
    cliPath
  );
  return resolveFrom("metro", cliMetroPath || cliPath);
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
