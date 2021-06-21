import * as ts from "typescript";
import { ProjectFileCache, ExternalFileCache } from "./cache";
import { Resolvers } from "./resolve";
import { ProjectConfig } from "./config";

export class Project {
  private resolvers: Resolvers;
  private projectConfig: ProjectConfig;

  private projectFiles: ProjectFileCache;
  private externalFiles: ExternalFileCache;

  private languageService: ts.LanguageService;

  constructor(
    documentRegistry: ts.DocumentRegistry,
    resolvers: Resolvers,
    projectConfig: ProjectConfig
  ) {
    this.resolvers = resolvers;
    this.projectConfig = projectConfig;

    this.projectFiles = new ProjectFileCache(projectConfig.fileNames);
    this.externalFiles = new ExternalFileCache();

    const languageServiceHost: ts.LanguageServiceHost = {
      getCompilationSettings: () => this.projectConfig.options,
      //getNewLine?(): string;
      //getProjectVersion?(): string;
      getScriptFileNames: () => this.projectFiles.getFileNames(),
      //getScriptKind?(fileName: string): ts.ScriptKind;
      getScriptVersion: (fileName) =>
        this.projectFiles.getVersion(fileName) ?? "0",
      getScriptSnapshot: (fileName) =>
        this.projectFiles.getSnapshot(fileName) ??
        this.externalFiles.getSnapshot(fileName),
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
      languageServiceHost,
      documentRegistry
    );
  }

  warmup() {
    this.languageService.getProgram();
  }

  validateFile(fileName: string): ts.Diagnostic[] {
    const syntax = this.languageService.getSyntacticDiagnostics(
      fileName
    ) as ts.Diagnostic[];
    const semantics = this.languageService.getSemanticDiagnostics(fileName);
    return syntax.concat(semantics);
  }

  validate(): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = [];
    for (const fileName of this.projectFiles.getFileNames()) {
      Array.prototype.push.apply(diagnostics, this.validateFile(fileName));
    }
    return diagnostics;
  }

  addFile(fileName: string) {
    this.projectFiles.add(fileName);
  }

  updateFile(fileName: string, snapshot?: ts.IScriptSnapshot) {
    this.projectFiles.update(fileName, snapshot);
  }

  removeFile(fileName: string) {
    this.projectFiles.delete(fileName);
  }
}
