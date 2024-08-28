import type { Config } from "@react-native-community/cli-types";
import * as fs from "node:fs";
import * as path from "node:path";
import ora from "ora";
import type { BuildResult, InputParams } from "./apple";
import { runBuild } from "./apple";

function findXcodeWorkspaces(searchDir: string) {
  return fs.existsSync(searchDir)
    ? fs.readdirSync(searchDir).filter((file) => file.endsWith(".xcworkspace"))
    : [];
}

export function buildMacOS(
  _config: Config,
  { workspace, ...buildParams }: InputParams,
  logger = ora()
): Promise<BuildResult> {
  if (workspace) {
    return runBuild(workspace, buildParams, logger);
  }

  const sourceDir = "macos";
  const workspaces = findXcodeWorkspaces(sourceDir);
  if (workspaces.length === 0) {
    logger.fail(
      "No Xcode workspaces were found; specify an Xcode workspace with `--workspace`"
    );
    process.exitCode = 1;
    return Promise.resolve(1);
  }

  if (workspaces.length > 1) {
    logger.fail(
      `Multiple Xcode workspaces were found; picking the first one: ${workspaces.join(", ")}`
    );
    logger.fail(
      "If this is wrong, specify another workspace with `--workspace`"
    );
  }

  return runBuild(path.join(sourceDir, workspaces[0]), buildParams, logger);
}
