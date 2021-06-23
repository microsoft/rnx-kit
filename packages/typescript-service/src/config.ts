import ts from "typescript";
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

  find(searchPath: string, fileName = "tsconfig.json"): string | undefined {
    return ts.findConfigFile(searchPath, ts.sys.fileExists, fileName);
  }

  load(configFileName: string): ProjectConfig {
    const commandLine = ts.getParsedCommandLineOfConfigFile(
      configFileName,
      {}, // optionsToExtend
      this.parseConfigFileHost,
      this.extendedConfigCache
    );
    if (!commandLine) {
      throw new Error(`Failed to load '${configFileName}'`);
    }

    if (isNonEmptyArray(commandLine.errors)) {
      this.diagnosticWriter.print(commandLine.errors);
      throw new Error(`Failed to load '${configFileName}'`);
    }

    return commandLine;
  }
}
