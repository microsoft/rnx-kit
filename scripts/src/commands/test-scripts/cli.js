import { URL, fileURLToPath } from "node:url";
import { RnxCli } from "../../../../incubator/tools-scripts/lib/index.js";
import { SCRIPT_TEST_COMMAND } from "./constants.js";
import { LintCommand } from "./test-lint.js";

function workspaceRoot() {
  return fileURLToPath(new URL("../../../../", import.meta.url));
}

/**
 * Create a new CLI instance for testing rnx-kit scripts
 * @returns {RnxCli}
 */
export function getCli() {
  const cli = new RnxCli(workspaceRoot(), {
    binaryLabel: "rnx-kit test-script CLI",
    binaryName: "rnx-kit-scripts " + SCRIPT_TEST_COMMAND,
    binaryVersion: "0.0.0",
    enableColors: true,
  });
  cli.register(LintCommand);
  return cli;
}
