import { requireModuleFromMetro } from "@rnx-kit/tools-react-native/metro";
import type { Terminal } from "metro-core";
import type { TerminalReporter } from "metro/src/lib/TerminalReporter";

export type MetroTerminal = {
  terminal: Terminal;
  reporter: TerminalReporter;
};

function getReporter(
  customReporterPath: string | undefined,
  projectRoot: string
): typeof TerminalReporter {
  if (customReporterPath) {
    const p = require.resolve(customReporterPath, { paths: [projectRoot] });
    return require(p);
  }

  return requireModuleFromMetro("metro/src/lib/TerminalReporter", projectRoot);
}

export function makeReporter(
  customReporterPath: string | undefined,
  terminal: Terminal,
  projectRoot: string
): TerminalReporter {
  const Reporter = getReporter(customReporterPath, projectRoot);
  return new Reporter(terminal);
}

export function makeTerminal(projectRoot: string): Terminal {
  const { Terminal } = requireModuleFromMetro("metro-core", projectRoot);
  return new Terminal(process.stdout);
}
