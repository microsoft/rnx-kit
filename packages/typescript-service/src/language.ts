import * as fs from "fs";
import * as ts from "typescript";
import { IResolvers } from "./resolve";

export function createLanguageService(
  documentRegistry: ts.DocumentRegistry,
  options: ts.CompilerOptions,
  resolvers: IResolvers
) {
  const fileVersions: ts.MapLike<number> = {};

  const languageServiceHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => Object.keys(fileVersions),
    getScriptVersion: (fileName) =>
      fileVersions.hasOwnProperty(fileName)
        ? fileVersions[fileName].toString()
        : "0",
    getScriptSnapshot: (fileName) => {
      if (!fs.existsSync(fileName)) {
        return undefined;
      }
      return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => options,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,

    resolveModuleNames: resolvers.resolveModuleNames,
    resolveTypeReferenceDirectives: resolvers.resolveTypeReferenceDirectives,
  };

  const languageService = ts.createLanguageService(
    languageServiceHost,
    documentRegistry
  );

  function validateFile(fileName: string) {
    return languageService
      .getCompilerOptionsDiagnostics()
      .concat(languageService.getSyntacticDiagnostics(fileName))
      .concat(languageService.getSemanticDiagnostics(fileName));
  }

  function loadFile(fileName: string, snapshot?: ts.IScriptSnapshot) {
    const exists = fileVersions.hasOwnProperty(fileName);
    const finalSnapshot =
      snapshot ||
      ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());

    if (!exists) {
      fileVersions[fileName] = 1;
      documentRegistry.acquireDocument(
        fileName,
        options,
        finalSnapshot,
        fileVersions[fileName].toString()
      );
    } else {
      fileVersions[fileName]++;
      documentRegistry.updateDocument(
        fileName,
        options,
        finalSnapshot,
        fileVersions[fileName].toString()
      );
    }
  }

  return {
    validateFile,
    loadFile,
  };
}
