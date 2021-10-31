import { createDiagnosticWriter } from "@rnx-kit/typescript-service";

import { parseCommandLine } from "./command-line";
import { showAllHelp, showHelp, showVersion } from "./commands";
import { compile } from "./compile";
import { tryReadTsConfigFile } from "./config";
import { createProgram, createIncrementalProgram } from "./program";
import { reportUnsupportedTscOptions } from "./unsupported";

export function cli(args: string[]): void {
  const cmdLine = parseCommandLine(args);
  if (cmdLine.ts.errors.length > 0) {
    const writer = createDiagnosticWriter();
    cmdLine.ts.errors.forEach((e) => writer.print(e));
    throw new Error("Failed to parse command-line");
  }

  if (cmdLine.ts.options.version) {
    showVersion();
    return;
  }
  if (cmdLine.ts.options.help) {
    showHelp();
    return;
  }
  if (cmdLine.ts.options.all) {
    showAllHelp();
    return;
  }

  reportUnsupportedTscOptions(cmdLine.ts.options, [
    "generateCpuProfile",
    "build",
    "locale",
    "init",
  ]);

  const config = tryReadTsConfigFile(cmdLine);
  if (config) {
    if (config.errors.length > 0) {
      const writer = createDiagnosticWriter();
      config.errors.forEach((e) => writer.print(e));
      throw new Error("Failed to load TypeScript configuration");
    }

    cmdLine.ts = config;
  }

  reportUnsupportedTscOptions(cmdLine.ts.options, [
    "showConfig",
    "diagnostics",
    "extendedDiagnostics",
    "generateTrace",
    "watch",
    "baseUrl",
    "paths",
    "rootDirs",
  ]);

  if (cmdLine.ts.options.incremental || cmdLine.ts.options.composite) {
    compile(createIncrementalProgram(cmdLine));
  } else {
    compile(createProgram(cmdLine));
  }
}
