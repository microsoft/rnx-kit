import ts from "typescript";
import { createDiagnosticWriter } from "./diagnostics";
import { ProjectConfigLoader } from "./config";
import { Project } from "./project";
import { createResolvers } from "./resolve";

export class Service {
  private documentRegistry;
  private diagnosticWriter;
  private projectConfigLoader;

  constructor(write?: (message: string) => void) {
    this.documentRegistry = ts.createDocumentRegistry();
    this.diagnosticWriter = createDiagnosticWriter(write);
    this.projectConfigLoader = new ProjectConfigLoader(this.diagnosticWriter);
  }

  findProject(
    searchPath: string,
    fileName = "tsconfig.json"
  ): string | undefined {
    return this.projectConfigLoader.find(searchPath, fileName);
  }

  openProject(configFileName: string): Project {
    const config = this.projectConfigLoader.load(configFileName);
    const resolvers = createResolvers(config.options);
    return new Project(
      this.documentRegistry,
      this.diagnosticWriter,
      resolvers,
      config
    );
  }
}
