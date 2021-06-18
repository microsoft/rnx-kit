import * as fs from "fs";
import * as ts from "typescript";
import { loadTsConfig } from "./config";
import { getCanonicalFileName } from "./util";
import { validateFile } from "./validate";

const config = loadTsConfig("./");
//console.log(commandLine);

const moduleResolutionCache = ts.createModuleResolutionCache(
  ts.sys.getCurrentDirectory(),
  getCanonicalFileName,
  config.options
);

const fileVersions: ts.MapLike<number> = {};
config.fileNames.forEach((fileName) => {
  fileVersions[fileName] = 1;
});

// Create the language service host to allow the LS to communicate with the host
const languageServiceHost: ts.LanguageServiceHost = {
  getScriptFileNames: () => config.fileNames,
  getScriptVersion: (fileName) =>
    fileName in fileVersions ? fileVersions[fileName].toString() : "0",
  getScriptSnapshot: (fileName) => {
    if (!fs.existsSync(fileName)) {
      return undefined;
    }
    return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
  },
  getCurrentDirectory: () => process.cwd(),
  getCompilationSettings: () => config.options,
  getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories,

  resolveModuleNames: (
    moduleNames: string[],
    containingFile: string,
    _reusedNames: string[] | undefined,
    redirectedReference?: ts.ResolvedProjectReference
  ): (ts.ResolvedModuleFull | undefined)[] => {
    const resolvedModules: (ts.ResolvedModuleFull | undefined)[] = [];
    for (const moduleName of moduleNames) {
      // try to use standard resolution
      let result = ts.resolveModuleName(
        moduleName,
        containingFile,
        config.options,
        {
          fileExists: ts.sys.fileExists,
          readFile: ts.sys.readFile,
        },
        moduleResolutionCache,
        redirectedReference
      );
      resolvedModules.push(result.resolvedModule);
    }
    return resolvedModules;
  },
  resolveTypeReferenceDirectives: (
    typeDirectiveNames: string[],
    containingFile: string,
    redirectedReference?: ts.ResolvedProjectReference
  ): (ts.ResolvedTypeReferenceDirective | undefined)[] => {
    const resolved: (ts.ResolvedTypeReferenceDirective | undefined)[] = [];
    for (const name of typeDirectiveNames) {
      let result = ts.resolveTypeReferenceDirective(
        name,
        containingFile,
        config.options,
        {
          fileExists: ts.sys.fileExists,
          readFile: ts.sys.readFile,
        },
        redirectedReference
      );
      resolved.push(result.resolvedTypeReferenceDirective);
    }
    return resolved;
  },
};

const documentRegistry = ts.createDocumentRegistry();
const services = ts.createLanguageService(
  languageServiceHost,
  documentRegistry
);

const f = config.fileNames[0];

// typecheck this file -- will succeed
validateFile(services, f);

// replace this file with some questionable code to generate errors
fileVersions[f]++;
documentRegistry.updateDocument(
  f,
  config.options,
  ts.ScriptSnapshot.fromString("function foo(x: any) { return 1; }"),
  fileVersions[f].toString(),
  ts.ScriptKind.TS
);

// typecheck again -- will fail
validateFile(services, f);
