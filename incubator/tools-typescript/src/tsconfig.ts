import {
  type PackageInfo,
  createPackageValueLoader,
} from "@rnx-kit/tools-packages";
import path from "node:path";
import ts from "typescript";
import { createDiagnosticWriter } from "./diagnostics";

type ConfigsByPath = Map<string, ts.ParsedCommandLine>;
const DEFAULT_CONFIG_NAME = "tsconfig.json";
const extendedConfigCache = new Map();

const getConfigMapForPackage = createPackageValueLoader<ConfigsByPath>(
  "tsconfigs",
  () => new Map()
);

const BASE_CONFIG_HOST: ts.ParseConfigFileHost = {
  useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
  readDirectory: ts.sys.readDirectory,
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  onUnRecoverableConfigFileDiagnostic: createDiagnosticWriter().print,
};

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

export function readTypeScriptConfig(
  pkgInfo: PackageInfo,
  configFileName: string = DEFAULT_CONFIG_NAME,
  optionsToExtend?: ts.CompilerOptions,
  watchOptionsToExtend?: ts.WatchOptions,
  onUnRecoverableConfigFileDiagnostic?: (diagnostic: ts.Diagnostic) => void,
  trace?: (message: string) => void
): ts.ParsedCommandLine {
  let cmdLineBase: ts.ParsedCommandLine | undefined = undefined;

  // setup the config parsing host, we can use the default unless logging operations are overridden
  const host = getConfigFileHost(onUnRecoverableConfigFileDiagnostic, trace);
  const lookup = getConfigMapForPackage(pkgInfo);
  if (lookup.has(configFileName)) {
    cmdLineBase = lookup.get(configFileName)!;
  } else {
    const configPath =
      path.isAbsolute(configFileName) || configFileName.startsWith(".")
        ? configFileName
        : ts.findConfigFile(pkgInfo.root, ts.sys.fileExists, configFileName);
    if (!configPath) {
      throw new Error("Unable to find tsconfig.json");
    }
    // normalize the path to posix to prevent false failure messages
    const configPathPosix = path.posix.normalize(configPath);
    cmdLineBase = ts.getParsedCommandLineOfConfigFile(
      configPathPosix,
      undefined,
      host,
      extendedConfigCache,
      undefined
    );
    if (!cmdLineBase) {
      throw new Error(`Unable to parse '${configPathPosix}'`);
    }
    lookup.set(configFileName, cmdLineBase);
  }

  // merge the options if needed
  return mergeConfigOptions(cmdLineBase, optionsToExtend, watchOptionsToExtend);
}
