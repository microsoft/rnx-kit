import type { Config } from "@react-native-community/cli-types";
import { invalidateState } from "@rnx-kit/tools-react-native/cache";
import * as fs from "node:fs";
import * as path from "node:path";
import ora from "ora";
import type { BuildResult } from "./apple";
import { runBuild } from "./apple";
import type { AppleInputParams } from "./types";

function findXcodeWorkspaces(searchDir: string) {
  return fs.existsSync(searchDir)
    ? fs.readdirSync(searchDir).filter((file) => file.endsWith(".xcworkspace"))
    : [];
}

export function buildMacOS(
  _config: Config,
  { workspace, ...buildParams }: AppleInputParams,
  logger = ora()
): Promise<BuildResult> {
  if (workspace) {
    return runBuild(workspace, buildParams, logger);
  }

  const sourceDir = "macos";
  const workspaces = findXcodeWorkspaces(sourceDir);
  if (workspaces.length === 0) {
    invalidateState();
    process.exitCode = 1;
    logger.fail(
      "No Xcode workspaces were found; specify an Xcode workspace with `--workspace`"
    );
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
