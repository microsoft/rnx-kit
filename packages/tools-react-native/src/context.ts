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
  CONFIG_CACHE_KEY,
  getCurrentState,
  getSavedState,
  loadConfigFromCache,
  saveConfigToCache,
} from "./cache.ts";

type LoadConfigOptions = {
  projectRoot: string;
  platforms: Record<string, unknown>;
};

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

function getConfigOrState<T = Config>(
  projectRoot: string,
  key = CONFIG_CACHE_KEY
): T | string {
  const state = getCurrentState(projectRoot);
  if (state === getSavedState(projectRoot, key)) {
    const config = loadConfigFromCache<T>(projectRoot, key);
    if (config) {
      return config;
    }
  }

  return state;
}

export function makeLoadConfigOptions(
  fn: typeof loadConfig,
  projectRoot: string,
  rncli?: string
) {
  if (fn.length !== 1) {
    return projectRoot as unknown as { projectRoot: string };
  }

  // As of 0.89, we have to manually include Android and iOS
  const opts: LoadConfigOptions = { projectRoot, platforms: {} };

  const paths = { paths: rncli ? [rncli, projectRoot] : [projectRoot] };
  const platforms = [
    ["android", "@react-native-community/cli-platform-android"],
    ["ios", "@react-native-community/cli-platform-ios"],
  ];

  for (const [platform, pkg] of platforms) {
    try {
      const p = require(require.resolve(pkg, paths));
      opts.platforms[platform] = {
        projectConfig: p.projectConfig,
        dependencyConfig: p.dependencyConfig,
      };
    } catch (_) {
      // Ignore
    }
  }

  return opts;
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

  const options = makeLoadConfigOptions(loadConfig, projectRoot, rncli);
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

  const options = makeLoadConfigOptions(loadConfig, projectRoot, rncli);

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
  const configCacheKey = "react-native.config";

  const state = getConfigOrState<Record<string, unknown>>(
    packageDir,
    configCacheKey
  );
  if (typeof state !== "string") {
    return state;
  }

  for (const configFile of REACT_NATIVE_CONFIG_FILES) {
    const configPath = path.join(packageDir, configFile);
    if (fs.existsSync(configPath)) {
      const url =
        process.platform === "win32"
          ? `file://${configPath.replaceAll("\\", "/")}`
          : configPath;
      const args = [
        "--no-warnings",
        "--eval",
        `import("${url}").then((config) => console.log(JSON.stringify(config.default ?? config)));`,
      ];

      const { stderr, stdout } = spawnSync(process.argv0, args, { cwd });

      const errors = stderr?.toString().trim();
      if (errors) {
        console.error(`${configPath}: ${errors}`);
      }

      const json = stdout?.toString().trim();
      if (!json) {
        return undefined;
      }

      const config = JSON.parse(json);
      saveConfigToCache(packageDir, state, config, configCacheKey);
      return config;
    }
  }

  return undefined;
}
