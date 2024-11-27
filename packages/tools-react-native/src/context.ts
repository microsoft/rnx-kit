import type { loadConfig } from "@react-native-community/cli";
import type { Config } from "@react-native-community/cli-types";
import {
  findPackageDependencyDir,
  readPackage,
} from "@rnx-kit/tools-node/package";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  getCurrentState,
  getSavedState,
  loadConfigFromCache,
  saveConfigToCache,
} from "./cache";

// As of 0.76, `@react-native-community/cli` is no longer a dependency of
// `react-native`. Consumers have to take a direct dependency on CLI instead.
const RN_CLI_DECOUPLED = 76;

export const REACT_NATIVE_CONFIG_FILES = [
  "react-native.config.ts",
  "react-native.config.mjs",
  "react-native.config.cjs",
  "react-native.config.js",
];

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

export function readReactNativeConfig(
  packageDir: string,
  cwd = process.cwd()
): Record<string, unknown> | undefined {
  for (const configFile of REACT_NATIVE_CONFIG_FILES) {
    const configPath = path.join(packageDir, configFile);
    if (fs.existsSync(configPath)) {
      const args = [
        "--no-warnings",
        "--eval",
        `import("${configPath}").then((config) => console.log(JSON.stringify(config.default ?? config)));`,
      ];
      const { stdout } = spawnSync(process.argv0, args, { cwd });
      const json = stdout.toString().trim();
      return json ? JSON.parse(json) : undefined;
    }
  }

  return undefined;
}
