import ts from "typescript";
import { createDiagnosticWriter } from "./diagnostics";
import { Project } from "./project";
import { ResolverHost } from "./resolve";

export class Service {
  private documentRegistry;
  private diagnosticWriter;

  constructor(write?: (message: string) => void) {
    this.documentRegistry = ts.createDocumentRegistry();
    this.diagnosticWriter = createDiagnosticWriter(write);
  }

  openProject(
    cmdLine: ts.ParsedCommandLine,
    resolverHost: ResolverHost
  ): Project {
    return new Project(
      this.documentRegistry,
      this.diagnosticWriter,
      resolverHost,
      cmdLine
    );
  }
}
