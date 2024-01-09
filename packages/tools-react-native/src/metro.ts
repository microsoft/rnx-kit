import {
  findPackageDependencyDir,
  readPackage,
} from "@rnx-kit/tools-node/package";

type MetroImport =
  | typeof import("metro")
  | typeof import("metro/src/Server").default
  | typeof import("metro/src/lib/TerminalReporter").TerminalReporter
  | typeof import("metro/src/shared/output/bundle")
  | typeof import("metro-config")
  | typeof import("metro-core")
  | typeof import("metro-resolver")
  | typeof import("metro-source-map");

type MetroModule =
  | "metro"
  | "metro/src/Server"
  | "metro/src/lib/TerminalReporter"
  | "metro/src/shared/output/bundle"
  | "metro-config"
  | "metro-core"
  | "metro-resolver"
  | "metro-source-map";

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

export function requireModuleFromMetro(
  moduleName: "metro",
  fromDir?: string
): typeof import("metro");

export function requireModuleFromMetro(
  moduleName: "metro/src/Server",
  fromDir?: string
): typeof import("metro/src/Server").default;

export function requireModuleFromMetro(
  moduleName: "metro/src/lib/TerminalReporter",
  fromDir?: string
): typeof import("metro/src/lib/TerminalReporter").TerminalReporter;

export function requireModuleFromMetro(
  moduleName: "metro/src/shared/output/bundle",
  fromDir?: string
): typeof import("metro/src/shared/output/bundle");

export function requireModuleFromMetro(
  moduleName: "metro-config",
  fromDir?: string
): typeof import("metro-config");

export function requireModuleFromMetro(
  moduleName: "metro-core",
  fromDir?: string
): typeof import("metro-core");

export function requireModuleFromMetro(
  moduleName: "metro-resolver",
  fromDir?: string
): typeof import("metro-resolver");

export function requireModuleFromMetro(
  moduleName: "metro-source-map",
  fromDir?: string
): typeof import("metro-source-map");

/**
 * Imports specified module starting from the installation directory of the
 * currently used `metro` version.
 */
export function requireModuleFromMetro(
  moduleName: MetroModule,
  fromDir = process.cwd()
): MetroImport {
  const startDir = findMetroPath(fromDir);
  if (!startDir) {
    throw new Error("Cannot find module 'metro'");
  }

  const metroDir = "metro/";
  const modulePath = moduleName.startsWith(metroDir)
    ? `${startDir}/${moduleName.substring(metroDir.length)}`
    : resolveFrom(moduleName, startDir);
  if (!modulePath) {
    throw new Error(
      `Cannot find module '${moduleName}'. This probably means that ` +
        "'@rnx-kit/tools-react-native' is not compatible with the version " +
        "of 'metro' that you are currently using. Please update to the " +
        "latest version and try again. If the issue still persists after the " +
        "update, please file a bug at " +
        "https://github.com/microsoft/rnx-kit/issues."
    );
  }

  return require(modulePath);
}
