import ts from "typescript";

export type DiagnosticWriter = {
  format: (diagnostic: ts.Diagnostic) => string;
  print: (diagnostic: ts.Diagnostic) => void;
};

function getCanonicalFileName(fileName: string): string {
  return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
}

function getNewLine(): string {
  return ts.sys.newLine;
}

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
