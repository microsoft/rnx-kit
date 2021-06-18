import * as ts from "typescript";
import { createConfigLoader } from "./config";
import { createLanguageService } from "./language";
import { createResolvers } from "./resolve";
import { createDiagnosticWriter } from "./diagnostics";

export function main() {
  const diagnosticWriter = createDiagnosticWriter();

  const configLoader = createConfigLoader(diagnosticWriter);
  const config = configLoader.loadTSConfig("./");
  //console.log(commandLine);

  const resolvers = createResolvers(config.options);

  const documentRegistry = ts.createDocumentRegistry();

  const languageService = createLanguageService(
    documentRegistry,
    config.options,
    resolvers
  );

  const f = config.fileNames[0];

  // typecheck this file -- will succeed
  console.log("loading file: %o", f);
  languageService.loadFile(f);

  console.log("validating file: %o", f);
  let diagnostics = languageService.validateFile(f);
  if (diagnostics.length > 0) {
    diagnosticWriter.print(diagnostics);
  }

  // replace this file with some questionable code to generate errors
  console.log("re-loading file: %o", f);
  languageService.loadFile(
    f,
    ts.ScriptSnapshot.fromString("function foo(x: any) { return 1; }")
  );

  // typecheck again -- will fail
  console.log("validating file: %o", f);
  diagnostics = languageService.validateFile(f);
  if (diagnostics.length > 0) {
    diagnosticWriter.print(diagnostics);
  }
}
