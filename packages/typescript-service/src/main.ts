import * as ts from "typescript";
import { ProjectConfigLoader } from "./config";
import { Project } from "./project";
import { createResolvers } from "./resolve";
import { createDiagnosticWriter } from "./diagnostics";
import { isNonEmptyArray } from "./util";

// TODO: add documentation (README.md)
// TODO: remove this file and hook it from index.ts
export function main() {
  const diagnosticWriter = createDiagnosticWriter();

  const projectConfigLoader = new ProjectConfigLoader(diagnosticWriter);
  const projectConfig = projectConfigLoader.load("./");

  const resolvers = createResolvers(projectConfig.options);

  const documentRegistry = ts.createDocumentRegistry();

  const project = new Project(documentRegistry, resolvers, projectConfig);
  project.warmup();

  const f = projectConfig.fileNames[0];

  // typecheck this file -- will succeed
  console.log("validating file: %o", f);
  let diagnostics = project.validateFile(f);
  if (diagnostics.length > 0) {
    diagnosticWriter.print(diagnostics);
  }

  // replace this file with some questionable code to generate errors
  console.log("re-loading file: %o", f);
  project.updateFile(
    f,
    ts.ScriptSnapshot.fromString("function foo(x: any) { return 1; }")
  );

  // typecheck again -- will fail
  console.log("validating file: %o", f);
  diagnostics = project.validateFile(f);
  if (isNonEmptyArray(diagnostics)) {
    diagnosticWriter.print(diagnostics);
  }

  console.log("removing file: %o", f);
  project.removeFile(f);

  console.log("re-adding file: %o", f);
  project.addFile(f);

  console.log("re-validating file: %o", f);
  diagnostics = project.validateFile(f);
  if (isNonEmptyArray(diagnostics)) {
    diagnosticWriter.print(diagnostics);
  }
}
