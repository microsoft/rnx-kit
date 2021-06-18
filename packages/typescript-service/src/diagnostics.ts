import * as ts from "typescript";
import { getCanonicalFileName, getNewLine } from "./util";

export type IDiagnosticWriter = {
  format: (diagnostic: ts.Diagnostic | ts.Diagnostic[]) => void;
  print: (diagnostic: ts.Diagnostic | ts.Diagnostic[]) => void;
};

export function createDiagnosticWriter(): IDiagnosticWriter {
  const formatDiagnosticsHost: ts.FormatDiagnosticsHost = {
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getCanonicalFileName,
    getNewLine,
  };

  function format(diagnostic: ts.Diagnostic | ts.Diagnostic[]) {
    return (
      ts.formatDiagnosticsWithColorAndContext(
        Array.isArray(diagnostic) ? diagnostic : [diagnostic],
        formatDiagnosticsHost
      ) + getNewLine()
    );
  }

  function print(diagnostic: ts.Diagnostic | ts.Diagnostic[]) {
    ts.sys.write(format(diagnostic));
  }

  return {
    format,
    print,
  };
}
