import { URL, fileURLToPath } from "node:url";
import { RnxCli } from "../../../incubator/tools-scripts/lib/index.js";
import { LintCommand } from "./test-lint.js";

function workspaceRoot() {
  return fileURLToPath(new URL("../../../", import.meta.url));
}

export async function runExperimentalCli() {
  const cli = new RnxCli(workspaceRoot(), {
    binaryLabel: "rnx-kit-scripts experimental CLI",
    binaryName: "rnx-kit-scripts",
    binaryVersion: "0.0.0",
    enableColors: true,
  });
  cli.register(LintCommand);
  const args = process.argv.slice(2).filter((arg) => arg !== "--experimental");
  return await cli.run(args, cli.context());
}
