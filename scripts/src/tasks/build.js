// @ts-check

const fs = require("fs");
const { encodeArgs, spawn } = require("just-scripts-utils");
const { argv, logger, series } = require("just-task");
const { getWorkspaceRoot } = require("workspace-tools");

/**
 * @param {string[]} tasks
 * @returns {ReturnType<series>}
 */
function build(...tasks) {
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

exports.build = build;
