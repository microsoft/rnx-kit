import type { Config as CLIConfig } from "@react-native-community/cli-types";
import path from "path";
import chalk from "chalk";

type Args = {
  platform: "android" | "ios" | "macos";
  projectRoot: string;
  bestEffort: boolean;
  keepNodeModules: boolean;
};

type CLICommand = {
  name: string;
  command: string;
  args: string[];
};

type CachePath = {
  name: string;
  path: string;
};

const fs = require("fs");
const os = require("os");
const npm = os.platform() === "win32" ? "npm.cmd" : "npm";
const yarn = os.platform() === "win32" ? "yarn.cmd" : "yarn";

export function rnxClean(
  _argv: string[],
  _config: CLIConfig,
  cliOptions: Args
): void {
  //validate root path
  if (!dirExists(cliOptions.projectRoot)) {
    console.log(
      chalk.red("error:"),
      "Invalid path provided! " + cliOptions.projectRoot
    );

    return;
  }

  const cachePaths: CachePath[] = [
    {
      name: "React native cache",
      path: "$TMPDIR/react-*",
    },
    {
      name: "Metro cache",
      path: "$TMPDIR/metro-*",
    },
    {
      name: "Haste cache",
      path: "$TMPDIR/haste-map-*",
    },
    {
      name: "node_modules",
      path: `${cliOptions.projectRoot}/node_modules`,
    },
  ];

  cachePaths.forEach((item) => {
    if (item.name !== "node_modules") cleanDir(item);
    else if (!cliOptions.keepNodeModules) cleanDir(item);
  });

  const allCommands = [
    {
      name: "Kill watchman",
      command: os.platform() === "windows" ? "tskill" : "killall",
      args: ["watchman"],
    },
    {
      name: "Clear watchman caches",
      command: "watchman",
      args: ["watchman-del-all"],
    },
    {
      name: "Clean yarn cache",
      command: yarn,
      args: ["cache", "clean"],
    },
    {
      name: "Verify npm cache",
      command: npm,
      args: ["cache", "verify"],
    },
  ];

  for (let i = 0; i < allCommands.length; i++) {
    const item = allCommands[i];

    const myPromise = QueryPromise(
      execute(
        { name: item.name, command: item.command, args: item.args },
        cliOptions.projectRoot
      )
    );

    if (!cliOptions.bestEffort && !myPromise.isFulfilled()) {
      return;
    }
  }

  switch (cliOptions.platform) {
    case "android": {
      findPath(cliOptions.projectRoot, "gradlew", (androidPath: string) => {
        execute(
          {
            name: "Gradle Clean",
            command: androidPath + "/gradlew",
            args: ["clean"],
          },
          cliOptions.projectRoot
        );
      });
      break;
    }
    case "ios": {
      findPath(
        cliOptions.projectRoot,
        "LaunchScreen.storyboard",
        (path: string) => {
          const iosPath = path.substring(0, path.lastIndexOf("/"));

          cleanDir({ name: "Pods Cache", path: `${iosPath}/Pods` });
          cleanDir({ name: "CocoaPods cache", path: "~/.cocoapods" });
          execute(
            {
              name: "Clean Pod Cache",
              command: "pod",
              args: ["cache", "clean", "--all"],
            },
            iosPath
          );
        }
      );

      break;
    }
    case "macos": {
      findPath(cliOptions.projectRoot, "-macOS", (path: string) => {
        const macosPath = path.substring(0, path.lastIndexOf("/"));

        cleanDir({ name: "Pods Cache", path: `${macosPath}/Pods` });
        cleanDir({ name: "CocoaPods cache", path: "~/.cocoapods" });
        execute(
          {
            name: "Clean Pod Cache",
            command: "pod",
            args: ["cache", "clean", "--all"],
          },
          macosPath
        );
      });

      break;
    }
  }
}

function findPath(
  startPath: string,
  filter: string,
  callback: (path: string) => void
) {
  const files = fs.readdirSync(startPath);

  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);

    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      //no need to check these dirs
      if (
        filename.indexOf(".git") >= 0 ||
        filename.indexOf(".xcodeproj") >= 0 ||
        filename.indexOf(".xcworkspace") >= 0 ||
        filename.indexOf(".xcassets") >= 0
      )
        continue;

      findPath(filename, filter, callback); //recurse
    } else if (filename.indexOf(filter) >= 0) {
      callback(startPath);
      break;
    }
  }
}

function cleanDir(item: CachePath) {
  console.log(chalk.cyan("info"), `Cleaning ${item.name}`);

  if (!dirExists(item.path)) {
    console.log(chalk.yellow("warning:"), `No such directory : ${item.path}`);

    return;
  }

  fs.rmdirSync(item.path, { recursive: true });
  console.log(chalk.cyan("info"), `Successfully cleaned: ${item.name}`);
}

function execute(item: CLICommand, rootPath: string) {
  return new Promise((resolve, reject) => {
    console.log(chalk.cyan("info"), item.name);
    console.log(chalk.dim(`${item.command} ${item.args.join(" ")}`));

    const { spawnSync } = require("child_process");

    const task = spawnSync(item.command, item.args, {
      cwd: rootPath ? path.resolve(rootPath) : undefined,
      stdio: "inherit",
    });

    if (task.error && task.error.code == "ENOENT") {
      console.log(
        chalk.red.bold("Error"),
        `${item.command} Failed! Command not found`
      );
      reject();
    } else if (task.error) {
      console.log(chalk.red.bold("Error"), task.error);
      reject();
    } else if (task.signal) {
      console.log(
        chalk.red.bold("Error"),
        `Failed with signal ${task.signal}'`
      );
      reject();
    } else if (task.status !== 0) {
      console.log(
        chalk.red.bold("Error"),
        `Failed with exit code ${task.status}'`
      );
      reject();
    }

    console.log(`${item.name} completed successfully!`);
    resolve(task.status);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function QueryPromise(promise: any) {
  // Don't modify any promise that has been already modified.
  if (promise.isFulfilled) return promise;

  // Set initial state
  let isPending = false;
  let isRejected = false;
  let isFulfilled = false;

  // Observe the promise, saving the fulfillment in a closure scope.
  const result = promise.then(
    function () {
      isFulfilled = true;
      isPending = false;
    },
    function () {
      isRejected = true;
      isPending = true;
    }
  );

  result.isFulfilled = function () {
    return isFulfilled;
  };
  result.isPending = function () {
    return isPending;
  };
  result.isRejected = function () {
    return isRejected;
  };

  return result;
}

function dirExists(directoryName: string) {
  return !fs.existsSync(directoryName) ? false : true;
}
