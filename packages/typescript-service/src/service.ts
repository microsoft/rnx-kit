import ts from "typescript";
import { createDiagnosticWriter } from "./diagnostics";
import { ProjectConfigLoader } from "./config";
import { Project } from "./project";
import { createResolvers } from "./resolve";

export class Service {
  private documentRegistry;
  private diagnosticWriter;
  private projectConfigLoader;

  constructor() {
    this.documentRegistry = ts.createDocumentRegistry();
    this.diagnosticWriter = createDiagnosticWriter();
    this.projectConfigLoader = new ProjectConfigLoader(this.diagnosticWriter);
  }

  openProject(
    searchPath: string,
    fileName: string = "tsconfig.json"
  ): Project | undefined {
    const configFileName = this.projectConfigLoader.find(searchPath, fileName);
    if (!configFileName) {
      console.error(
        "Cannot find project configuration file %o under search-path %o",
        fileName,
        searchPath
      );
      return undefined;
    }

    return this.openProjectByFile(configFileName);
  }

  openProjectByFile(configFileName: string): Project {
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
