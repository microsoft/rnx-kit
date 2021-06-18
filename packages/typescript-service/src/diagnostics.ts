import * as ts from "typescript";
import { getCanonicalFileName, getNewLine } from "./util";

const formatDiagnosticsHost: ts.FormatDiagnosticsHost = {
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getCanonicalFileName,
  getNewLine,
};

export function printDiagnostic(diagnostic: ts.Diagnostic) {
  printDiagnostics([diagnostic]);
}

export function printDiagnostics(diagnostics: ts.Diagnostic[]) {
  ts.sys.write(
    ts.formatDiagnosticsWithColorAndContext(
      diagnostics,
      formatDiagnosticsHost
    ) + getNewLine()
  );
}
