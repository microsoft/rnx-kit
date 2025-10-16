import ts from "typescript";
import { createDiagnosticWriter } from "./diagnostics.ts";
import { Project } from "./project.ts";

export class Service {
  private documentRegistry;
  private diagnosticWriter;

  constructor(write?: (message: string) => void) {
    this.documentRegistry = ts.createDocumentRegistry();
    this.diagnosticWriter = createDiagnosticWriter(write);
  }

  openProject(
    cmdLine: ts.ParsedCommandLine,
    enhanceLanguageServiceHost?: (host: ts.LanguageServiceHost) => void
  ): Project {
    return new Project(
      this.documentRegistry,
      this.diagnosticWriter,
      cmdLine,
      enhanceLanguageServiceHost
    );
  }
}
