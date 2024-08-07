import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { spawn } from "node:child_process";
import { existsSync as fileExists } from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ora from "ora";
import { asResolvedPath } from "./helpers/parsers";

type Args = {
  include?: string;
  projectRoot?: string;
  verifyCache?: boolean;
};

type Task = {
  label: string;
  action: () => Promise<void>;
};

type CLICommand = Record<string, Task[]>;

export async function rnxClean(
  _argv: string[],
  { root = process.cwd() }: CLIConfig,
  cliOptions: Args
): Promise<void> {
  if (!fileExists(root)) {
    throw new Error(`Invalid project root: ${root}`);
  }

  const npm = os.platform() === "win32" ? "npm.cmd" : "npm";
  const yarn = os.platform() === "win32" ? "yarn.cmd" : "yarn";

  const execute = (command: string, args: string[], cwd = root) => {
    return new Promise<void>((resolve, reject) => {
      const process = spawn(command, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        shell: command.endsWith(".bat") || command.endsWith(".cmd"),
      });

      process.on("error", (e) => {
        const code = "code" in e ? e.code : "errno" in e ? e.errno : "1";
        reject(`${e.message} (code: ${code})`);
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve();
        }
      });
    });
  };

  const COMMANDS: CLICommand = {
    android: [
      {
        label: "Clean Gradle cache",
        action: () => {
          const candidates =
            os.platform() === "win32"
              ? ["android/gradlew.bat", "gradlew.bat"]
              : ["android/gradlew", "gradlew"];
          const gradlew = findPath(root, candidates);
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
        action: () => execute("pod", ["cache", "clean", "--all"]),
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
        action: () => cleanDir(`${root}/node_modules`),
      },
      ...(cliOptions.verifyCache
        ? [
            {
              label: "Verify npm cache",
              action: () => execute(npm, ["cache", "verify"]),
            },
          ]
        : []),
    ],
    watchman: [
      {
        label: "Stop Watchman",
        action: () =>
          execute(os.platform() === "win32" ? "tskill" : "killall", [
            "watchman",
          ]),
      },
      {
        label: "Delete Watchman cache",
        action: () => execute("watchman", ["watch-del-all"]),
      },
    ],
    yarn: [
      {
        label: "Clean Yarn cache",
        action: () => execute(yarn, ["cache", "clean"]),
      },
    ],
  };

  const categories = cliOptions.include?.split(",") ?? ["metro", "watchman"];

  const spinner = ora();
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
  if (!fileExists(path)) {
    return Promise.resolve();
  }

  return fs.rm(path, { maxRetries: 3, recursive: true });
}

function findPath(startPath: string, files: string[]): string | undefined {
  // TODO: Find project files via `@react-native-community/cli`
  for (const file of files) {
    const filename = path.resolve(startPath, file);
    if (fileExists(filename)) {
      return filename;
    }
  }

  return undefined;
}

export const rnxCleanCommand = {
  name: "rnx-clean",
  func: rnxClean,
  description: "Clears React Native project related caches",
  options: [
    {
      name: "--include <android,cocoapods,metro,npm,watchman,yarn>",
      description: "Comma-separated flag of caches to clear e.g., `npm,yarn`",
      default: "metro,watchman",
    },
    {
      name: "--project-root <path>",
      description: "Root path to your React Native project",
      default: process.cwd(),
      parse: asResolvedPath,
    },
    {
      name: "--verify-cache",
      description: "Whether to verify the integrity of the cache",
      default: false,
    },
  ],
};
