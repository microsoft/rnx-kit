import * as ts from "typescript";
import { DiagnosticWriter } from "./diagnostics";
import { isNonEmptyArray } from "./util";

export type ProjectConfig = ts.ParsedCommandLine;

export class ProjectConfigLoader {
  private diagnosticWriter: DiagnosticWriter;
  private parseConfigFileHost: ts.ParseConfigFileHost;
  private extendedConfigCache: ts.ESMap<string, ts.ExtendedConfigCacheEntry>;

  constructor(diagnosticWriter: DiagnosticWriter) {
    this.diagnosticWriter = diagnosticWriter;
    this.parseConfigFileHost = {
      useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
      readDirectory: ts.sys.readDirectory,
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      onUnRecoverableConfigFileDiagnostic: diagnosticWriter.print,
    };
    this.extendedConfigCache = new Map();
  }

  public load(
    searchPath: string,
    fileName: string = "tsconfig.json"
  ): ProjectConfig {
    const configFileName = ts.findConfigFile(
      searchPath,
      ts.sys.fileExists,
      fileName
    );
    if (!configFileName) {
      throw new Error(
        `Failed to find '${fileName}' under search-path '${searchPath}'`
      );
    }

    const commandLine = ts.getParsedCommandLineOfConfigFile(
      configFileName,
      {}, // optionsToExtend
      this.parseConfigFileHost,
      this.extendedConfigCache
    );
    if (!commandLine) {
      throw new Error(`Failed to load '${fileName}' (${configFileName})`);
    }

    if (isNonEmptyArray(commandLine.errors)) {
      this.diagnosticWriter.print(commandLine.errors);
      throw new Error(`Failed to load '${fileName}' (${configFileName})`);
    }

    return commandLine;
  }
}
