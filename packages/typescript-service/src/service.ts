import ts from "typescript";
import { createDiagnosticWriter } from "./diagnostics";
import { ProjectConfig, ProjectConfigLoader } from "./config";
import { Project } from "./project";
import { ResolverHost } from "./resolve";

export class Service {
  private documentRegistry;
  private diagnosticWriter;
  private projectConfigLoader;

  constructor(write?: (message: string) => void) {
    this.documentRegistry = ts.createDocumentRegistry();
    this.diagnosticWriter = createDiagnosticWriter(write);
    this.projectConfigLoader = new ProjectConfigLoader(this.diagnosticWriter);
  }

  getProjectConfigLoader(): ProjectConfigLoader {
    return this.projectConfigLoader;
  }

  openProject(config: ProjectConfig, resolverHost: ResolverHost): Project {
    return new Project(
      this.documentRegistry,
      this.diagnosticWriter,
      resolverHost,
      config
    );
  }
}
