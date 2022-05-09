import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { spawn } from "child_process";
import * as fs from "fs-extra";
import ora from "ora";
import * as os from "os";
import * as path from "path";

type Args = {
  include?: string;
  projectRoot?: string;
  verify?: boolean;
};

type Task = {
  label: string;
  action: () => Promise<void>;
};

type CLICommand = {
  [key: string]: Task[];
};

export async function rnxClean(
  _argv: string[],
  _config: CLIConfig,
  cliOptions: Args
): Promise<void> {
  const projectRoot = cliOptions.projectRoot ?? process.cwd();
  if (!fs.existsSync(projectRoot)) {
    throw new Error(`Invalid path provided! ${projectRoot}`);
  }

  const spinner = ora();
  try {
    require.resolve("@react-native-community/cli-clean");
    spinner.warn(
      "`rnx-clean` has been upstreamed to `@react-native-community/cli`. Please use `npx react-native clean` instead."
    );
  } catch (_) {
    // Ignore
  }

  const npm = os.platform() === "win32" ? "npm.cmd" : "npm";
  const yarn = os.platform() === "win32" ? "yarn.cmd" : "yarn";

  const COMMANDS: CLICommand = {
    android: [
      {
        label: "Clean Gradle cache",
        action: () => {
          const candidates =
            os.platform() === "win32"
              ? ["android/gradlew.bat", "gradlew.bat"]
              : ["android/gradlew", "gradlew"];
          const gradlew = findPath(projectRoot, candidates);
          if (gradlew) {
            const script = path.basename(gradlew);
            return execute(
              os.platform() === "win32" ? script : `./${script}`,
              ["clean"],
              path.dirname(gradlew)
            );
          } else {
            return Promise.resolve();
          }
        },
      },
    ],
    cocoapods: [
      {
        label: "Clean CocoaPods cache",
        action: () => execute("pod", ["cache", "clean", "--all"], projectRoot),
      },
    ],
    metro: [
      {
        label: "Clean Metro cache",
        action: () => cleanDir(`${os.tmpdir()}/metro-*`),
      },
      {
        label: "Clean Haste cache",
        action: () => cleanDir(`${os.tmpdir()}/haste-map-*`),
      },
      {
        label: "Clean React Native cache",
        action: () => cleanDir(`${os.tmpdir()}/react-*`),
      },
    ],
    npm: [
      {
        label: "Remove node_modules",
        action: () => cleanDir(`${projectRoot}/node_modules`),
      },
      ...(cliOptions.verify
        ? [
            {
              label: "Verify npm cache",
              action: () => execute(npm, ["cache", "verify"], projectRoot),
            },
          ]
        : []),
    ],
    watchman: [
      {
        label: "Stop Watchman",
        action: () =>
          execute(
            os.platform() === "win32" ? "tskill" : "killall",
            ["watchman"],
            projectRoot
          ),
      },
      {
        label: "Delete Watchman cache",
        action: () => execute("watchman", ["watch-del-all"], projectRoot),
      },
    ],
    yarn: [
      {
        label: "Clean Yarn cache",
        action: () => execute(yarn, ["cache", "clean"], projectRoot),
      },
    ],
  };

  const categories = cliOptions.include?.split(",") ?? [
    "metro",
    "npm",
    "watchman",
    "yarn",
  ];

  for (const category of categories) {
    const commands = COMMANDS[category];
    if (!commands) {
      spinner.warn(`Unknown category: ${category}`);
      return;
    }

    for (const { action, label } of commands) {
      spinner.start(label);
      await action()
        .then(() => {
          spinner.succeed();
        })
        .catch((e) => {
          spinner.fail(`${label} » ${e}`);
        });
    }
  }
}

function cleanDir(path: string): Promise<void> {
  if (!fs.existsSync(path)) {
    return Promise.resolve();
  }

  return fs.rmdir(path, { maxRetries: 3, recursive: true });
}

function findPath(startPath: string, files: string[]): string | undefined {
  // TODO: Find project files via `@react-native-community/cli`
  for (const file of files) {
    const filename = path.resolve(startPath, file);
    if (fs.existsSync(filename)) {
      return filename;
    }
  }

  return undefined;
}

function execute(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      cwd,
      stdio: ["inherit", null, null],
    });

    const stderr: Buffer[] = [];
    process.stderr.on("data", (data) => {
      stderr.push(data);
    });

    process.on("close", (code, signal) => {
      if (code === 0) {
        resolve();
      } else if (stderr) {
        reject(Buffer.concat(stderr).toString().trimEnd());
      } else if (signal) {
        reject(`Failed with signal ${signal}`);
      } else {
        reject(`Failed with exit code ${code}`);
      }
    });
  });
}
