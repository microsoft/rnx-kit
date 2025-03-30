import ts from "typescript";

function getCanonicalFileName(fileName: string): string {
  return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
}

function getNewLine(): string {
  return ts.sys.newLine;
}

const formatDiagnosticsHost: ts.FormatDiagnosticsHost = {
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getCanonicalFileName,
  getNewLine,
};

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  // Format the diagnostic message using TypeScript's built-in formatting
  return ts.formatDiagnosticsWithColorAndContext(
    Array.isArray(diagnostic) ? diagnostic : [diagnostic],
    formatDiagnosticsHost
  );
}

function writeDiagnostic(diagnostic: ts.Diagnostic): void {
  const message = formatDiagnostic(diagnostic);
  ts.sys.write(message);
}

/**
 * @param write optional custom write function to handle the output of diagnostics
 * @returns a diagnostic writer that can be passed to typescript. Only creates a new function if write is overridden.
 */
export function getDiagnosticWriter(
  write?: (message: string) => void
): ts.DiagnosticReporter {
  if (!write) {
    return writeDiagnostic;
  }

  // create a custom writer if a custom write function is provided
  return (diagnostic: ts.Diagnostic): void => {
    // If a custom write function is provided, use it to write the diagnostic message
    const message = formatDiagnostic(diagnostic);
    write(message);
  };
}
