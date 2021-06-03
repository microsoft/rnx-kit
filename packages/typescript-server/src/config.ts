import * as ts from "typescript";
import { printDiagnostic, printDiagnostics } from "./diagnostics";

const parseConfigFileHost: ts.ParseConfigFileHost = {
  useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
  readDirectory: ts.sys.readDirectory,
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  onUnRecoverableConfigFileDiagnostic: printDiagnostic,
};

const extendedConfigCache: ts.ESMap<string, ts.ExtendedConfigCacheEntry> =
  new Map();

export function loadTsConfig(
  searchPath: string,
  fileName: string = "tsconfig.json"
): ts.ParsedCommandLine {
  const p = ts.findConfigFile(searchPath, ts.sys.fileExists, fileName);
  if (!p) {
    throw new Error(
      `Failed to find '${fileName}' under search-path '${searchPath}'`
    );
  }

  const commandLine = ts.getParsedCommandLineOfConfigFile(
    p,
    {},
    parseConfigFileHost,
    extendedConfigCache
  );
  if (!commandLine) {
    throw new Error(`Failed to load/parse '${fileName}'`);
  }

  if (commandLine.errors && commandLine.errors.length > 0) {
    printDiagnostics(commandLine.errors);
    throw new Error(`Failed to load/parse '${fileName}'`);
  }

  return commandLine;
}
