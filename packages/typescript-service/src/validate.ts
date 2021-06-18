import * as ts from "typescript";
import { printDiagnostics } from "./diagnostics";

export function validateFile(service: ts.LanguageService, fileName: string) {
  console.log("File: " + fileName);

  let allDiagnostics = service
    .getCompilerOptionsDiagnostics()
    .concat(service.getSyntacticDiagnostics(fileName))
    .concat(service.getSemanticDiagnostics(fileName));

  if (!allDiagnostics || allDiagnostics.length === 0) {
    console.log("  Success");
    return;
  }

  printDiagnostics(allDiagnostics);
}
