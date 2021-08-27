import type { TerminalReporter } from "metro/src/lib/TerminalReporter";
import { Terminal } from "metro-core";
import path from "path";

type ErrorWithCode = Error & {
  code?: string;
};

export type MetroTerminal = {
  terminal: Terminal;
  reporter: TerminalReporter;
};

function isErrorWithCode(err: unknown): err is ErrorWithCode {
  return typeof err === "object" && err !== null && "code" in err;
}

function getTerminalReporterClass(
  customReporterPath: string | undefined
): typeof TerminalReporter {
  if (customReporterPath === undefined) {
    return require("metro/src/lib/TerminalReporter");
  }
  try {
    // First we let require resolve it, so we can require packages in node_modules
    // as expected. eg: require('my-package/reporter');
    return require(customReporterPath);
  } catch (e) {
    if (isErrorWithCode(e) && e.code !== "MODULE_NOT_FOUND") {
      throw e;
    }
    // If that doesn't work, then we next try relative to the cwd, eg:
    // require('./reporter');
    return require(path.resolve(customReporterPath));
  }
}

export function createTerminal(customReporterPath?: string): MetroTerminal {
  const terminal = new Terminal(process.stdout);

  const TerminalReporterClass = getTerminalReporterClass(customReporterPath);
  const reporter = new TerminalReporterClass(terminal);

  return { terminal, reporter };
}
