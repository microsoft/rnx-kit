import { isNonEmptyArray } from "@rnx-kit/tools-language/array";
import chalk from "chalk";
import ts from "typescript";
import { ExternalFileCache, ProjectFileCache } from "./cache";
import { DiagnosticWriter } from "./diagnostics";

export class Project {
  private diagnosticWriter: DiagnosticWriter;
  private cmdLine: ts.ParsedCommandLine;

  private projectFiles: ProjectFileCache;
  private externalFiles: ExternalFileCache;

  private languageService: ts.LanguageService;

  constructor(
    documentRegistry: ts.DocumentRegistry,
    diagnosticWriter: DiagnosticWriter,
    cmdLine: ts.ParsedCommandLine,
    enhanceLanguageServiceHost?: (host: ts.LanguageServiceHost) => void
  ) {
    this.diagnosticWriter = diagnosticWriter;
    this.cmdLine = cmdLine;

    this.projectFiles = new ProjectFileCache(cmdLine.fileNames);
    this.externalFiles = new ExternalFileCache();

    const languageServiceHost: ts.LanguageServiceHost = {
      getCompilationSettings: () => this.cmdLine.options,
      //getNewLine?(): string;
      //getProjectVersion?(): string;
      getScriptFileNames: () => this.projectFiles.getFileNames(),
      //getScriptKind?(fileName: string): ts.ScriptKind;
      getScriptVersion: (fileName) =>
        this.projectFiles.getVersion(fileName) ?? "0",
      getScriptSnapshot: (fileName) =>
        this.projectFiles.getSnapshot(fileName) ??
        this.externalFiles.getSnapshot(fileName),
      getProjectReferences: (): readonly ts.ProjectReference[] | undefined =>
        cmdLine.projectReferences,
      //getLocalizedDiagnosticMessages?(): any;
      //getCancellationToken?(): HostCancellationToken;
      getCurrentDirectory: () => process.cwd(),
      getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
      log: (s: string): void => console.log(chalk.cyanBright(s)),
      trace: (s: string): void => console.log(chalk.greenBright(s)),
      error: (s: string): void => console.error(chalk.redBright(s)),
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
      //resolveModuleNames?(moduleNames: string[], containingFile: string, reusedNames: string[] | undefined, redirectedReference: ResolvedProjectReference | undefined, options: CompilerOptions): (ResolvedModule | undefined)[];
      //getResolvedModuleWithFailedLookupLocationsFromCache?(modulename: string, containingFile: string): ResolvedModuleWithFailedLookupLocations | undefined;
      //resolveTypeReferenceDirectives?(typeDirectiveNames: string[], containingFile: string, redirectedReference: ResolvedProjectReference | undefined, options: CompilerOptions): (ResolvedTypeReferenceDirective | undefined)[];

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

    if (enhanceLanguageServiceHost) {
      enhanceLanguageServiceHost(languageServiceHost);
    }

    this.languageService = ts.createLanguageService(
      languageServiceHost,
      documentRegistry
    );
  }

  getCommandLine(): ts.ParsedCommandLine {
    return this.cmdLine;
  }

  private getFileDiagnostics(fileName: string): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = [];
    Array.prototype.push.apply(
      diagnostics,
      this.languageService.getSyntacticDiagnostics(fileName)
    );
    Array.prototype.push.apply(
      diagnostics,
      this.languageService.getSemanticDiagnostics(fileName)
    );
    Array.prototype.push.apply(
      diagnostics,
      this.languageService.getSuggestionDiagnostics(fileName)
    );
    return diagnostics;
  }

  validateFile(fileName: string): boolean {
    const diagnostics = this.getFileDiagnostics(fileName).filter(
      (d) => d.category !== ts.DiagnosticCategory.Suggestion
    );
    if (isNonEmptyArray(diagnostics)) {
      diagnostics.forEach((d) => this.diagnosticWriter.print(d));
      return false;
    }
    return true;
  }

  validate(): boolean {
    //  filter down the list of files to be checked
    const matcher = this.cmdLine.options.checkJs ? /[.][jt]sx?$/ : /[.]tsx?$/;
    const files = this.projectFiles
      .getFileNames()
      .filter((f) => f.match(matcher));

    //  check each file
    let result = true;
    for (const file of files) {
      //  always validate the file, even if others have failed
      const fileResult = this.validateFile(file);
      //  combine this file's result with the aggregate result
      result = result && fileResult;
    }
    return result;
  }

  emitFile(fileName: string): boolean {
    const output = this.languageService.getEmitOutput(fileName);
    if (!output || output.emitSkipped) {
      this.validateFile(fileName);
      return false;
    }
    output.outputFiles.forEach((o) => {
      ts.sys.writeFile(o.name, o.text);
    });
    return true;
  }

  emit(): boolean {
    //  emit each file
    let result = true;
    for (const file of this.projectFiles.getFileNames()) {
      //  always emit the file, even if others have failed
      const fileResult = this.emitFile(file);
      //  combine this file's result with the aggregate result
      result = result && fileResult;
    }
    return result;
  }

  hasFile(fileName: string): boolean {
    return this.projectFiles.has(fileName);
  }

  setFile(fileName: string, snapshot?: ts.IScriptSnapshot): void {
    this.projectFiles.set(fileName, snapshot);
  }

  removeFile(fileName: string): void {
    this.projectFiles.remove(fileName);
  }

  removeAllFiles(): void {
    this.projectFiles.removeAll();
  }

  dispose(): void {
    this.languageService.dispose();

    // @ts-expect-error `languageService` cannot be used after calling dispose
    this.languageService = null;
  }
}
