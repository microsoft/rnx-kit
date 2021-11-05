import { addRange } from "@rnx-kit/tools-language";
import { createDiagnosticWriter } from "@rnx-kit/typescript-service";
import os from "os";
import ts from "typescript";

export function compile(
  program: ts.Program | ts.EmitAndSemanticDiagnosticsBuilderProgram
): void {
  const isListFilesOnly = program.getCompilerOptions().listFilesOnly;

  const allDiagnostics = program.getConfigFileParsingDiagnostics().slice();
  const configFileParsingDiagnosticsLength = allDiagnostics.length;
  addRange(
    allDiagnostics,
    program.getSyntacticDiagnostics() as ts.Diagnostic[]
  );
  if (allDiagnostics.length === configFileParsingDiagnosticsLength) {
    addRange(allDiagnostics, program.getOptionsDiagnostics());
    if (!isListFilesOnly) {
      addRange(allDiagnostics, program.getGlobalDiagnostics());
      if (allDiagnostics.length === configFileParsingDiagnosticsLength) {
        addRange(allDiagnostics, program.getSemanticDiagnostics());
      }
    }
  }

  const emitResult = isListFilesOnly
    ? { emitSkipped: true, diagnostics: [] }
    : program.emit();
  addRange(allDiagnostics, emitResult.diagnostics);

  const diagnostics = Array.from(
    ts.sortAndDeduplicateDiagnostics(allDiagnostics)
  );
  if (diagnostics.length > 0) {
    const writer = createDiagnosticWriter();
    let errors = 0;

    diagnostics.forEach((d) => {
      writer.print(d);
      if (d.category === ts.DiagnosticCategory.Error) {
        errors++;
      }
    });

    if (errors > 0) {
      console.log(
        os.EOL +
          (errors === 1 ? "Found 1 error." : `Found ${errors} errors.`) +
          os.EOL
      );
    }
  }
}
