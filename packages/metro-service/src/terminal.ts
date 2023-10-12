import { requireModuleFromMetro } from "@rnx-kit/tools-react-native/metro";
import type { Terminal } from "metro-core";
import type { TerminalReporter } from "metro/src/lib/TerminalReporter";
import * as path from "path";
import { requireMetroPath } from "./metro";

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

  const metroPath = requireMetroPath(projectRoot);
  return require(path.join(metroPath, "src", "lib", "TerminalReporter"));
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
