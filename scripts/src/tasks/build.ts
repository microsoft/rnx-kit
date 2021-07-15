import fs from "fs";
import { encodeArgs, spawn } from "just-scripts-utils";
import { argv, logger, series } from "just-task";
import { getWorkspaceRoot } from "workspace-tools";

export function build(...tasks: string[]): () => Promise<void> {
  const { dependencies } = argv();
  if (!dependencies) {
    return series(...tasks);
  }

  return () => {
    const manifest = fs.readFileSync("package.json", { encoding: "utf-8" });
    const { name } = JSON.parse(manifest);

    const lageCommand = [
      require.resolve("lage/bin/lage"),
      "build",
      "--grouped",
      "--log-level",
      "info",
      "--no-deps",
      "--scope",
      name,
    ];

    logger.info(encodeArgs(lageCommand).join(" "));
    return spawn(process.execPath, lageCommand, {
      cwd: getWorkspaceRoot(process.cwd()),
      stdio: "inherit",
    });
  };
}
