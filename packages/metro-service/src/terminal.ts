import { hasProperty } from "@rnx-kit/tools-language/properties";
import { Terminal } from "metro-core";
import type { TerminalReporter } from "metro/src/lib/TerminalReporter";
import path from "path";

export type MetroTerminal = {
  terminal: Terminal;
  reporter: TerminalReporter;
};

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
    if (!hasProperty(e, "code") || e.code !== "MODULE_NOT_FOUND") {
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
