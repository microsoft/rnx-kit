import type { Command, Config } from "@react-native-community/cli-types";
import { invalidateState } from "@rnx-kit/tools-react-native/cache";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import ora from "ora";
import type { WindowsBuildParams, WindowsInputParams } from "./types.ts";

export type BuildArgs = {
  solution: string;
  args: string[];
};

export type BuildResult = BuildArgs | number | null;

function findRunCommand(startDir: string): Command | undefined {
  try {
    const fromProjectRoot = { paths: [startDir] };
    const rnwPath = require.resolve(
      "react-native-windows/package.json",
      fromProjectRoot
    );

    const fromRnwDir = { paths: [path.dirname(rnwPath)] };
    const cliPath = require.resolve("@react-native-windows/cli", fromRnwDir);

    const cli = require(cliPath) as typeof import("@react-native-windows/cli");
    return cli.commands.find((cmd) => cmd.name === "run-windows");
  } catch (_) {
    // Handled by caller
  }

  return undefined;
}

function findSolution(searchDir: string, logger: ora.Ora): string | undefined {
  const solutions = fs.existsSync(searchDir)
    ? fs.readdirSync(searchDir).filter((file) => file.endsWith(".sln"))
    : [];

  if (solutions.length === 0) {
    invalidateState();
    process.exitCode = 1;
    logger.fail(
      "No Visual Studio solutions were found; specify a Visual Studio solution with `--solution`"
    );
    return undefined;
  }

  if (solutions.length > 1) {
    logger.info(
      `Multiple Visual Studio solutions were found; picking the first one: ${solutions.join(", ")}`
    );
    logger.info("If this is wrong, specify another solution with `--solution`");
  }

  return path.join(searchDir, solutions[0]);
}

function toRunWindowsOptions(
  sln: string,
  { root }: Config,
  { configuration, architecture, launch, deploy }: WindowsBuildParams
) {
  return {
    release: configuration === "Release",
    root,
    arch: architecture ?? os.arch(),
    packager: false,
    bundle: false,
    launch: Boolean(launch),
    autolink: true,
    build: true,
    deploy: Boolean(deploy),
    sln,
  };
}

export function runWindowsCommand(
  config: Config,
  params: WindowsInputParams,
  logger: ora.Ora,
  callback: (
    solution: string,
    run: Command["func"],
    options: Record<string, unknown>
  ) => Promise<BuildResult>
) {
  if (process.platform !== "win32") {
    logger.fail("Windows builds can only be performed on Windows hosts");
    return Promise.resolve(1);
  }

  const sourceDir = "windows";
  const solution = params.solution || findSolution(sourceDir, logger);
  if (!solution) {
    return Promise.resolve(1);
  }

  const runCommand = findRunCommand(config.root);
  if (!runCommand) {
    logger.fail(
      "Failed to find `@react-native-windows/cli`, make sure `react-native-windows` is installed."
    );
    return Promise.resolve(1);
  }

  const options = toRunWindowsOptions(solution, config, params);
  return callback(solution, runCommand.func, options);
}

export function buildWindows(
  config: Config,
  params: WindowsInputParams,
  additionalArgs: string[],
  logger = ora()
): Promise<BuildResult> {
  return runWindowsCommand(config, params, logger, (solution, run, options) => {
    const build = run(additionalArgs, config, options);
    return build
      ? build.then(() => ({ solution, args: additionalArgs }))
      : Promise.resolve(1);
  });
}
