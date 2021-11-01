import ts from "typescript";
import { createDiagnosticWriter } from "./diagnostics";

export function findConfigFile(
  searchPath: string,
  fileName = "tsconfig.json"
): string | undefined {
  return ts.findConfigFile(searchPath, ts.sys.fileExists, fileName);
}

export function readConfigFile(
  configFileName: string,
  optionsToExtend?: ts.CompilerOptions,
  watchOptionsToExtend?: ts.WatchOptions,
  onUnRecoverableConfigFileDiagnostic?: (diagnostic: ts.Diagnostic) => void,
  trace?: (message: string) => void
): ts.ParsedCommandLine | undefined {
  if (!onUnRecoverableConfigFileDiagnostic) {
    const writer = createDiagnosticWriter();
    onUnRecoverableConfigFileDiagnostic = writer.print;
  }
  const host: ts.ParseConfigFileHost = {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    readDirectory: ts.sys.readDirectory,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    trace,
    onUnRecoverableConfigFileDiagnostic,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
  };

  const extendedConfigCache = new Map();

  // When TypeScript encounters an error reading the config file, it creates
  // a diagnostic which includes the config file path. Newer versions of
  // TypeScript have an internal "assert" which verifies that the diagnostic
  // file path matches the input file path. It doesn't because TS normalizes
  // to posix path separators. This all happens internally to TS and seems
  // like a regression. The workaround is to convert to posix separators,
  // even on Windows, since they are supported across all platforms.
  const configFileNamePosix = configFileName.replace(/\\/g, "/");

  return ts.getParsedCommandLineOfConfigFile(
    configFileNamePosix,
    optionsToExtend,
    host,
    extendedConfigCache,
    watchOptionsToExtend
  );
}
