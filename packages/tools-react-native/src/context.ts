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
 * @param root Project root; defaults to current working directory
 */
export function loadContext(root = process.cwd()): Config {
  const state = getCurrentState(root);
  if (state === getSavedState(root)) {
    const config = loadConfigFromCache(root);
    if (config) {
      return config;
    }
  }

  const rncli = resolveCommunityCLI(root);
  const { loadConfig } = require(rncli);

  const config: Config =
    loadConfig.length === 1
      ? loadConfig({ projectRoot: root })
      : loadConfig(root);

  saveConfigToCache(root, state, config);

  return config;
}
