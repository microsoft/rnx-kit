import type { Config as CLIConfig } from "@react-native-community/cli-types";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import os from "os";
import { info, warn, error } from "@rnx-kit/console";

type Args = {
  include: string;
  projectRoot: string;
};

type CLICommand = {
  [key: string]: { label: string; action: () => void }[];
};

const npm = os.platform() === "win32" ? "npm.cmd" : "npm";
const yarn = os.platform() === "win32" ? "yarn.cmd" : "yarn";

export function rnxClean(
  _argv: string[],
  _config: CLIConfig,
  cliOptions: Args
): void {
  const currentWorkingDirectory = cliOptions.projectRoot ?? process.cwd();

  //validate root path
  if (!fs.existsSync(currentWorkingDirectory)) {
    throw new Error(`Invalid path provided! ${currentWorkingDirectory}`);
  }

  const COMMANDS: CLICommand = {
    android: [
      {
        label: "Cleaning Android Cache",
        action: () => {
          findPath(
            currentWorkingDirectory,
            "gradlew",
            "android",
            (path: string) => {
              execute("./gradlew", ["clean"], path);
            }
          );
        },
      },
    ],
    ios: [
      {
        label: "Cleaning IOS Caches ",
        action: () => {
          findPath(
            currentWorkingDirectory,
            "Podfile",
            "ios",
            (path: string) => {
              execute("pod", ["cache", "clean", "--all"], path);
            }
          );
        },
      },
    ],
    haste: [
      {
        label: "Cleaning Haste Cache",
        action: () => {
          cleanDir("$TMPDIR/haste-map-*");
        },
      },
    ],
    npm: [
      {
        label: "Removing node_modules",
        action: () => {
          cleanDir(`${currentWorkingDirectory}/node_modules`);
        },
      },
      {
        label: "Verifying npm Cache",
        action: () => {
          execute(npm, ["cache", "verify"], currentWorkingDirectory);
        },
      },
    ],
    macos: [
      {
        label: "Cleaning MacOS Caches ",
        action: () => {
          findPath(
            currentWorkingDirectory,
            "Podfile",
            "macos",
            (path: string) => {
              execute("pod", ["cache", "clean", "--all"], path);
            }
          );
        },
      },
    ],
    metro: [
      {
        label: "Cleaning Metro Cache",
        action: () => {
          cleanDir("$TMPDIR/metro-*");
        },
      },
    ],
    react: [
      {
        label: "Cleaning React Native Cache",
        action: () => {
          cleanDir("$TMPDIR/react-*");
        },
      },
    ],
    watchman: [
      {
        label: "Stopping watchman",
        action: () => {
          execute(
            os.platform() === "win32" ? "tskill" : "killall",
            ["watchman"],
            currentWorkingDirectory
          );
        },
      },
      {
        label: "Deleting watchman Cache",
        action: () => {
          execute("watchman", ["watchman-del-all"], currentWorkingDirectory);
        },
      },
    ],
    yarn: [
      {
        label: "Cleaning Yarn Cache",
        action: () => {
          execute(yarn, ["cache", "clean"], currentWorkingDirectory);
        },
      },
    ],
  };

  const categories = (
    cliOptions.include
      ? cliOptions.include
      : "haste,npm,metro,react,watchman,yarn"
  ).split(",");

  categories.forEach((category) => {
    const commands = COMMANDS[category];
    if (!commands) {
      warn("Unknown category:", category);
      return;
    }

    commands.forEach(({ label, action }) => {
      info(label);
      action();
    });
  });
}

function findPath(
  startPath: string,
  filter: string,
  platform: string,
  callback: (path: string) => void
) {
  const files = fs.readdirSync(startPath);

  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);

    const stat = fs.lstatSync(filename);

    if (stat.isDirectory() && files[i] === platform) {
      findPath(filename, filter, platform, callback); //recurse
      return;
    } else if (filename.indexOf(filter) >= 0) {
      callback(startPath);
      return;
    }
  }

  warn(`Could not find ${platform} path in ${startPath}`);
}

function cleanDir(path: string) {
  if (!fs.existsSync(path)) {
    return;
  }

  fs.rmdirSync(path, { recursive: true });
  info(`Successfully cleaned: ${path}`);
}

function execute(command: string, args: string[], rootPath: string) {
  info(chalk.dim(`${command} ${args.join(" ")}`));

  const { spawnSync } = require("child_process");

  const task = spawnSync(command, args, {
    cwd: rootPath ? path.resolve(rootPath) : undefined,
    stdio: "inherit",
  });

  if (task.error && task.error.code == "ENOENT") {
    warn(`${command} Failed! Command not found`);
  } else if (task.error) {
    error(task.error);
  } else if (task.signal) {
    error(`Failed with signal ${task.signal}'`);
  } else if (task.status !== 0) {
    error(`Failed with exit code ${task.status}'`);
  }
}
