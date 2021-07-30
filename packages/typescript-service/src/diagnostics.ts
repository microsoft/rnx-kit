import ts from "typescript";
import { getCanonicalFileName, getNewLine } from "./util";

export type DiagnosticWriter = {
  format: (diagnostic: ts.Diagnostic | ts.Diagnostic[]) => void;
  print: (diagnostic: ts.Diagnostic | ts.Diagnostic[]) => void;
};

export function createDiagnosticWriter(
  write?: (message: string) => void
): DiagnosticWriter {
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
    const message = format(diagnostic);
    if (write) {
      write(message);
    } else {
      ts.sys.write(message);
    }
  }

  return {
    format,
    print,
  };
}
