const { spawnSync } = require("child_process");
const os = require("os");

const chalk = require("chalk");
const { getPackageInfo } = require("just-repo-utils");

function yarnSync(args) {
  const yarnCommand = os.platform() === "win32" ? "yarn.cmd" : "yarn";
  const spawnOptions = { cwd: process.cwd(), stdio: "inherit" };
  spawnSync(yarnCommand, args, spawnOptions);
}

// force the cache to rebuild and reset
getPackageInfo({ strategy: "update" });

// build the build-tools
console.log(chalk.cyan("\nBuilding the build system...\n"));
yarnSync(["run", "build-tools"]);
