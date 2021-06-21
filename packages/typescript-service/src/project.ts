import * as fs from "fs";
import * as ts from "typescript";
import { Resolvers } from "./resolve";
import { ProjectConfig } from "./config";

class VersionedSnapshot {
  fileName: string;
  private version: number;
  private snapshot?: ts.IScriptSnapshot;

  constructor(fileName: string) {
    this.fileName = fileName;
    this.version = 1;
  }

  getVersion(): string {
    return this.version.toString();
  }

  getSnapshot(): ts.IScriptSnapshot {
    if (!this.snapshot) {
      console.log("Loading File: %o", this.fileName);
      const content = fs.readFileSync(this.fileName, "utf8");
      this.snapshot = ts.ScriptSnapshot.fromString(content);
    }
    return this.snapshot;
  }

  update(snapshot?: ts.IScriptSnapshot) {
    this.version++;
    this.snapshot = snapshot;
  }
}

export class Project {
  private documentRegistry: ts.DocumentRegistry;
  private resolvers: Resolvers;
  private projectConfig: ProjectConfig;

  private projectFiles: Map<string, VersionedSnapshot>;
  private externalFiles: Map<string, VersionedSnapshot>;

  private languageServiceHost: ts.LanguageServiceHost;

  private languageService: ts.LanguageService;

  constructor(
    documentRegistry: ts.DocumentRegistry,
    resolvers: Resolvers,
    projectConfig: ProjectConfig
  ) {
    this.documentRegistry = documentRegistry;
    this.resolvers = resolvers;
    this.projectConfig = projectConfig;

    this.projectFiles = new Map();
    projectConfig.fileNames.forEach((fileName) => {
      this.projectFiles.set(fileName, new VersionedSnapshot(fileName));
    });

    // TODO: the files in this list need to be file-watched. on add/mod/del, remove from this list and let the file be re-cached on demand
    this.externalFiles = new Map();

    this.languageServiceHost = {
      getCompilationSettings: () => this.projectConfig.options,
      //getNewLine?(): string;
      //getProjectVersion?(): string;
      getScriptFileNames: () => Array.from(this.projectFiles.keys()),
      //getScriptKind?(fileName: string): ts.ScriptKind;
      getScriptVersion: (fileName) =>
        this.projectFiles.get(fileName)?.getVersion() ?? "0",
      getScriptSnapshot: (fileName) => {
        if (this.projectFiles.has(fileName)) {
          return this.projectFiles.get(fileName)!.getSnapshot();
        }
        if (!this.externalFiles.has(fileName)) {
          this.externalFiles.set(fileName, new VersionedSnapshot(fileName));
        }
        return this.externalFiles.get(fileName)!.getSnapshot();
      },
      //getProjectReferences?(): readonly ProjectReference[] | undefined;
      //getLocalizedDiagnosticMessages?(): any;
      //getCancellationToken?(): HostCancellationToken;
      getCurrentDirectory: () => process.cwd(),
      getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
      //log?(s: string): void;
      //trace?(s: string): void;
      //error?(s: string): void;
      //useCaseSensitiveFileNames?(): boolean;

      /*
       * LS host can optionally implement these methods to support completions for module specifiers.
       * Without these methods, only completions for ambient modules will be provided.
       */
      readDirectory: ts.sys.readDirectory,
      readFile: ts.sys.readFile,
      realpath: ts.sys.realpath,
      fileExists: ts.sys.fileExists,

      /*
       * LS host can optionally implement these methods to support automatic updating when new type libraries are installed
       */
      //getTypeRootsVersion?(): number;

      /*
       * LS host can optionally implement this method if it wants to be completely in charge of module name resolution.
       * if implementation is omitted then language service will use built-in module resolution logic and get answers to
       * host specific questions using 'getScriptSnapshot'.
       *
       * If this is implemented, `getResolvedModuleWithFailedLookupLocationsFromCache` should be too.
       */
      resolveModuleNames: this.resolvers.resolveModuleNames,
      getResolvedModuleWithFailedLookupLocationsFromCache:
        this.resolvers.getResolvedModuleWithFailedLookupLocationsFromCache,
      resolveTypeReferenceDirectives:
        this.resolvers.resolveTypeReferenceDirectives,

      /*
       * Required for full import and type reference completions.
       * These should be unprefixed names. E.g. `getDirectories("/foo/bar")` should return `["a", "b"]`, not `["/foo/bar/a", "/foo/bar/b"]`.
       */
      getDirectories: ts.sys.getDirectories,

      /**
       * Gets a set of custom transformers to use during emit.
       */
      //getCustomTransformers?(): CustomTransformers | undefined;

      //isKnownTypesPackageName?(name: string): boolean;
      //installPackage?(options: InstallPackageOptions): Promise<ApplyCodeActionCommandResult>;
      //writeFile?(fileName: string, content: string): void;

      //getParsedCommandLine?(fileName: string): ParsedCommandLine | undefined;

      directoryExists: ts.sys.directoryExists,
    };

    this.languageService = ts.createLanguageService(
      this.languageServiceHost,
      this.documentRegistry
    );
  }

  public warmup() {
    this.languageService.getProgram();
  }

  public validateFile(fileName: string) {
    return this.languageService
      .getCompilerOptionsDiagnostics()
      .concat(this.languageService.getSyntacticDiagnostics(fileName))
      .concat(this.languageService.getSemanticDiagnostics(fileName));
  }

  public addOrUpdateFile(fileName: string, snapshot?: ts.IScriptSnapshot) {
    if (this.projectFiles.has(fileName)) {
      this.projectFiles.get(fileName)!.update(snapshot);
    } else {
      this.projectFiles.set(fileName, new VersionedSnapshot(fileName));
    }
  }

  public removeFile(fileName: string) {
    this.projectFiles.delete(fileName);
  }
}
