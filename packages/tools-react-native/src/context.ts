import type { loadConfig } from "@react-native-community/cli";
import type { Config } from "@react-native-community/cli-types";
import {
  findPackageDependencyDir,
  readPackage,
} from "@rnx-kit/tools-node/package";
import {
  getCurrentState,
  getSavedState,
  loadConfigFromCache,
  saveConfigToCache,
} from "./cache";

// As of 0.76, `@react-native-community/cli` is no longer a dependency of
// `react-native`. Consumers have to take a direct dependency on CLI instead.
const RN_CLI_DECOUPLED = 76;

function toNumber(version: string): number {
  const [major, minor = 0] = version.split(".");
  return Number(major) * 1000 + Number(minor);
}

function findStartDir(root: string, reactNativePath = ""): string {
  const reactNative =
    reactNativePath ||
    findPackageDependencyDir("react-native", {
      startDir: root,
      resolveSymlinks: true,
    });
  if (!reactNative) {
    return root;
  }

  const { version } = readPackage(reactNative);
  return toNumber(version) < RN_CLI_DECOUPLED ? reactNative : root;
}

function getConfigOrState(projectRoot: string): Config | string {
  const state = getCurrentState(projectRoot);
  if (state === getSavedState(projectRoot)) {
    const config = loadConfigFromCache(projectRoot);
    if (config) {
      return config;
    }
  }

  return state;
}

function makeLoadConfigOptions(fn: typeof loadConfig, projectRoot: string) {
  return fn.length === 1
    ? { projectRoot }
    : (projectRoot as unknown as { projectRoot: string });
}

/**
 * Finds path to `@react-native-community/cli`.
 * @param root Project root
 * @param reactNativePath Path to `react-native`, if known
 */
export function resolveCommunityCLI(
  root: string,
  reactNativePath = ""
): string {
  const startDir = findStartDir(root, reactNativePath);
  return require.resolve("@react-native-community/cli", { paths: [startDir] });
}

/**
 * Equivalent to calling `loadConfig()` from `@react-native-community/cli`, but
 * the result is cached for faster subsequent accesses.
 * @param projectRoot Project root; defaults to current working directory
 */
export function loadContext(projectRoot = process.cwd()): Config {
  const state = getConfigOrState(projectRoot);
  if (typeof state !== "string") {
    return state;
  }

  const rncli = resolveCommunityCLI(projectRoot);
  const { loadConfig } = require(rncli);

  const options = makeLoadConfigOptions(loadConfig, projectRoot);
  const config = loadConfig(options);
  saveConfigToCache(projectRoot, state, config);
  return config;
}

/**
 * Equivalent to calling `loadConfigAsync()` (with fallback to `loadConfig()`)
 * from `@react-native-community/cli`, but the result is cached for faster
 * subsequent accesses.
 * @param projectRoot Project root; defaults to current working directory
 */
export async function loadContextAsync(
  projectRoot = process.cwd()
): Promise<Config> {
  const state = getConfigOrState(projectRoot);
  if (typeof state !== "string") {
    return state;
  }

  const rncli = resolveCommunityCLI(projectRoot);
  const { loadConfig, loadConfigAsync } = require(rncli);

  const options = makeLoadConfigOptions(loadConfig, projectRoot);

  if (!loadConfigAsync) {
    const config = loadConfig(options);
    saveConfigToCache(projectRoot, state, config);
    return config;
  }

  const config = await loadConfigAsync(options);
  saveConfigToCache(projectRoot, state, config);
  return config;
}
