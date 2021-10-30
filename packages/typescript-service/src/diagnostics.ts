import ts from "typescript";
import { getCanonicalFileName, getNewLine } from "./util";

export type DiagnosticWriter = {
  format: (diagnostic: ts.Diagnostic) => string;
  print: (diagnostic: ts.Diagnostic) => void;
};

export function createDiagnosticWriter(
  write?: (message: string) => void
): DiagnosticWriter {
  const writeDiagnostic = write ?? ts.sys.write;

  const formatDiagnosticsHost: ts.FormatDiagnosticsHost = {
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getCanonicalFileName,
    getNewLine,
  };

  function format(diagnostic: ts.Diagnostic): string {
    return ts.formatDiagnosticsWithColorAndContext(
      Array.isArray(diagnostic) ? diagnostic : [diagnostic],
      formatDiagnosticsHost
    );
  }

  function print(diagnostic: ts.Diagnostic) {
    const message = format(diagnostic);
    writeDiagnostic(message);
  }

  return {
    format,
    print,
  };
}
