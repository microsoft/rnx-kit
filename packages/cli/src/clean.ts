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

type OnError = (code: number | null) => void;

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

  const isWindows = os.platform() === "win32";

  const execute = (
    command: string,
    args: string[],
    cwd = root,
    onError?: OnError
  ) => {
    return new Promise<void>((resolve, reject) => {
      const process = spawn(command, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        shell: command.endsWith(".bat") || command.endsWith(".cmd"),
      });

      process.on("error", (e) => {
        const code = "code" in e ? e.code : "errno" in e ? e.errno : "1";
        switch (code) {
          case "ENOENT":
            reject(`Unknown command: ${command}`);
            break;
          default:
            reject(`${e.message} (code: ${code})`);
            break;
        }
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else if (onError) {
          onError(code);
          resolve();
        } else {
          reject(code);
        }
      });
    });
  };

  const COMMANDS: CLICommand = {
    get android() {
      return [
        {
          label: "Clean Gradle cache",
          action: () => {
            const candidates = isWindows
              ? ["android/gradlew.bat", "gradlew.bat"]
              : ["android/gradlew", "gradlew"];
            const gradlew = findPath(root, candidates);
            if (gradlew) {
              const script = path.basename(gradlew);
              return execute(
                isWindows ? script : `./${script}`,
                ["clean"],
                path.dirname(gradlew)
              );
            } else {
              return Promise.resolve();
            }
          },
        },
      ];
    },
    get cocoapods() {
      return [
        {
          label: "Clean CocoaPods cache",
          action: () => execute("pod", ["cache", "clean", "--all"]),
        },
      ];
    },
    get metro() {
      const tmpdir = os.tmpdir();
      return [
        {
          label: "Clean Metro cache",
          action: () => cleanDir(`${tmpdir}/metro-*`),
        },
        {
          label: "Clean Haste cache",
          action: () => cleanDir(`${tmpdir}/haste-map-*`),
        },
        {
          label: "Clean React Native cache",
          action: () => cleanDir(`${tmpdir}/react-*`),
        },
      ];
    },
    get npm() {
      const npm = isWindows ? "npm.cmd" : "npm";
      return [
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
      ];
    },
    get watchman() {
      const kill = isWindows ? "tskill" : "killall";
      const ignoreError = () => void 0;
      return [
        {
          label: "Stop Watchman",
          action: () => execute(kill, ["watchman"], root, ignoreError),
        },
        {
          label: "Delete Watchman cache",
          action: () => execute("watchman", ["watch-del-all"]),
        },
      ];
    },
    get xcode() {
      return [
        {
          label: "Clean Xcode Simulator cache",
          action: () =>
            cleanDir(`${os.homedir()}/Library/Developer/CoreSimulator/Caches`),
        },
      ];
    },
    get yarn() {
      const yarn = isWindows ? "yarn.cmd" : "yarn";
      return [
        {
          label: "Clean Yarn cache",
          action: () => execute(yarn, ["cache", "clean"]),
        },
      ];
    },
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
      name: "--include <android,cocoapods,metro,npm,watchman,xcode,yarn>",
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
