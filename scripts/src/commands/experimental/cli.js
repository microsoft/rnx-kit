import { URL, fileURLToPath } from "node:url";

function workspaceRoot() {
  return fileURLToPath(new URL("../../../../", import.meta.url));
}

export async function runExperimentalCli() {
  const { RnxCli } = await import(
    "../../../../incubator/tools-scripts/lib/index.js"
  );
  const { LintCommand } = await import("./test-lint.js");

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
