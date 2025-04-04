import {
  type PackageInfo,
  createPackageValueAccessors,
  createPackageValueLoader,
} from "@rnx-kit/tools-packages";
import path from "node:path";
import ts from "typescript";
import { getDiagnosticWriter } from "./diagnostics";

type ConfigsByPath = Map<string, ts.ParsedCommandLine>;
const DEFAULT_CONFIG_NAME = "tsconfig.json";
const extendedConfigCache = new Map();

/**
 * Create accessors to get and set the default TypeScript config for a package.
 */
const { get: getDefaultConfig, set: setDefaultConfig } =
  createPackageValueAccessors<ts.ParsedCommandLine>("tsconfig");

/**
 * Separate the optional cache map for non-default TypeScript configs from the default config to avoid
 * creating an extra map in the most common case
 */
const getConfigMapForPackage = createPackageValueLoader<ConfigsByPath>(
  "tsconfigMap",
  () => new Map()
);

/**
 * Create a base config host once time to parsing config files.
 */
const BASE_CONFIG_HOST: ts.ParseConfigFileHost = {
  useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
  readDirectory: ts.sys.readDirectory,
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  onUnRecoverableConfigFileDiagnostic: getDiagnosticWriter(),
};

/**
 * Either return the base host or create a new one with overrides for diagnostics and tracing, but only if necessary
 */
function getConfigFileHost(
  onUnRecoverableConfigFileDiagnostic?: (diagnostic: ts.Diagnostic) => void,
  trace?: (message: string) => void
): ts.ParseConfigFileHost {
  // just return the default host if no overrides are provided
  if (!onUnRecoverableConfigFileDiagnostic && !trace) {
    return BASE_CONFIG_HOST;
  }

  // otherwise create a new host with the overrides
  const host = { ...BASE_CONFIG_HOST };
  if (onUnRecoverableConfigFileDiagnostic) {
    host.onUnRecoverableConfigFileDiagnostic =
      onUnRecoverableConfigFileDiagnostic;
  }
  if (trace) {
    host.trace = trace;
  }
  return host;
}

/**
 * @param config the base config to apply changes on top of
 * @param optionsToExtend compiler options to extend with
 * @param watchOptionsToExtend watch options to extend with
 * @returns a ParsedCommandLine with the changes applied. If no changes are provided, the original config is returned.
 */
export function mergeConfigOptions(
  config: ts.ParsedCommandLine,
  optionsToExtend?: ts.CompilerOptions,
  watchOptionsToExtend?: ts.WatchOptions
): ts.ParsedCommandLine {
  if (optionsToExtend || watchOptionsToExtend) {
    config = { ...config };
    if (optionsToExtend) {
      config.options = { ...config.options, ...optionsToExtend };
    }
    if (watchOptionsToExtend) {
      config.watchOptions = { ...config.watchOptions, ...watchOptionsToExtend };
    }
  }
  return config;
}

/**
 * Load the TypeScript config file given a name, start dir, and host for loading
 */
function loadConfigFileUncached(
  configFileName: string,
  rootDir: string,
  host: ts.ParseConfigFileHost
): ts.ParsedCommandLine {
  const configPath =
    path.isAbsolute(configFileName) || configFileName.startsWith(".")
      ? configFileName
      : ts.findConfigFile(rootDir, ts.sys.fileExists, configFileName);

  if (!configPath) {
    throw new Error("Unable to find tsconfig.json");
  }

  // normalize the path to posix to prevent false failure messages
  const configPathPosix = path.posix.normalize(configPath);

  // now load the config file using the provided host
  const parsedCmdLine = ts.getParsedCommandLineOfConfigFile(
    configPathPosix,
    undefined,
    host,
    extendedConfigCache,
    undefined
  );

  if (!parsedCmdLine) {
    throw new Error(`Unable to parse '${configPathPosix}'`);
  }
  return parsedCmdLine;
}

/**
 * @param pkgInfo the package info to read the config for
 * @param configFileName file name or path to the config file to read, falls back to tsconfig.json
 * @param optionsToExtend options to extend with
 * @param watchOptionsToExtend watch options to extend with
 * @param onUnRecoverableConfigFileDiagnostic optional callback for unrecoverable config file diagnostics
 * @param trace optional trace function for config file parsing
 * @returns a loaded and merged ParsedCommandLine
 * @throws if the config file cannot be found or parsed
 */
export function readTypeScriptConfig(
  pkgInfo: PackageInfo,
  configFileName: string = DEFAULT_CONFIG_NAME,
  optionsToExtend?: ts.CompilerOptions,
  watchOptionsToExtend?: ts.WatchOptions,
  onUnRecoverableConfigFileDiagnostic?: (diagnostic: ts.Diagnostic) => void,
  trace?: (message: string) => void
): ts.ParsedCommandLine {
  const defaultConfig = configFileName === DEFAULT_CONFIG_NAME;
  // check if we have a cached version of the config already loaded
  let cmdLineBase: ts.ParsedCommandLine | undefined = defaultConfig
    ? getDefaultConfig(pkgInfo)
    : getConfigMapForPackage(pkgInfo).get(configFileName);

  if (!cmdLineBase) {
    // setup the config parsing host, we can use the default unless logging operations are overridden
    const host = getConfigFileHost(onUnRecoverableConfigFileDiagnostic, trace);
    cmdLineBase = loadConfigFileUncached(configFileName, pkgInfo.root, host);
    if (defaultConfig) {
      setDefaultConfig(pkgInfo, cmdLineBase);
    } else {
      getConfigMapForPackage(pkgInfo).set(configFileName, cmdLineBase);
    }
  }

  // merge the options if needed
  return mergeConfigOptions(cmdLineBase, optionsToExtend, watchOptionsToExtend);
}
