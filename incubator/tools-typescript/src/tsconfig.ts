import path from "node:path";
import ts from "typescript";
import { getDiagnosticWriter } from "./diagnostics.ts";

const DEFAULT_CONFIG_NAME = "tsconfig.json";
const extendedConfigCache = new Map();

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
  return loadTypeScriptConfig(configPath, host);
}

/**
 * Helper function to load TypeScript config files without needing to define the host each time. This does no caching
 * or special handling besides providing an extendedConfigCache to Typescript to speed up loading of extended configs.
 *
 * @param configPath path to a tsconfig.json file to load
 * @param host optional host implementation if this needs to be overridden, generally safe to omit this
 * @returns a ParsedCommandLine representing the loaded config file including resolution and merging of extends
 */
export function loadTypeScriptConfig(
  configPath: string,
  host?: ts.ParseConfigFileHost
): ts.ParsedCommandLine {
  // typescript wants the config path to be posix, so normalize it before loading
  configPath = path.posix.normalize(configPath);

  // ensure we have a host to load the config file with
  host ??= getConfigFileHost();

  const parsedCmdLine = ts.getParsedCommandLineOfConfigFile(
    configPath,
    undefined,
    host,
    extendedConfigCache,
    undefined
  );

  if (!parsedCmdLine) {
    throw new Error(`Unable to parse '${configPath}'`);
  }
  return parsedCmdLine;
}

/**
 * @param rootDir the root directory to read the config for
 * @param configFileName file name or path to the config file to read, falls back to tsconfig.json
 * @param optionsToExtend options to extend with
 * @param watchOptionsToExtend watch options to extend with
 * @param onUnRecoverableConfigFileDiagnostic optional callback for unrecoverable config file diagnostics
 * @param trace optional trace function for config file parsing
 * @returns a loaded and merged ParsedCommandLine
 * @throws if the config file cannot be found or parsed
 */
export function readTypeScriptConfig(
  rootDir: string,
  configFileName: string = DEFAULT_CONFIG_NAME,
  optionsToExtend?: ts.CompilerOptions,
  watchOptionsToExtend?: ts.WatchOptions,
  onUnRecoverableConfigFileDiagnostic?: (diagnostic: ts.Diagnostic) => void,
  trace?: (message: string) => void
): ts.ParsedCommandLine {
  // setup the config parsing host, we can use the default unless logging operations are overridden
  const host = getConfigFileHost(onUnRecoverableConfigFileDiagnostic, trace);
  const cmdLineBase = loadConfigFileUncached(configFileName, rootDir, host);

  // merge the options if needed
  return mergeConfigOptions(cmdLineBase, optionsToExtend, watchOptionsToExtend);
}
