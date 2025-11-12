import type { Config } from "@react-native-community/cli-types";
import { invalidateState } from "@rnx-kit/tools-react-native/cache";
import * as fs from "node:fs";
import * as path from "node:path";
import ora from "ora";
import type { BuildResult } from "./apple.ts";
import { runBuild } from "./apple.ts";
import type { AppleInputParams } from "./types.ts";

function findXcodeWorkspaces(
  searchDir: string,
  logger: ora.Ora
): string | undefined {
  const workspaces = fs.existsSync(searchDir)
    ? fs.readdirSync(searchDir).filter((file) => file.endsWith(".xcworkspace"))
    : [];

  if (workspaces.length === 0) {
    invalidateState();
    process.exitCode = 1;
    logger.fail(
      "No Xcode workspaces were found; specify an Xcode workspace with `--workspace`"
    );
    return undefined;
  }

  if (workspaces.length > 1) {
    logger.fail(
      `Multiple Xcode workspaces were found; picking the first one: ${workspaces.join(", ")}`
    );
    logger.fail(
      "If this is wrong, specify another workspace with `--workspace`"
    );
  }

  return path.join(searchDir, workspaces[0]);
}

export function buildMacOS(
  _config: Config,
  { workspace, ...buildParams }: AppleInputParams,
  logger = ora()
): Promise<BuildResult> {
  if (process.platform !== "darwin") {
    logger.fail("macOS builds can only be performed on macOS hosts");
    return Promise.resolve(1);
  }

  const sourceDir = "macos";
  const xcworkspace = workspace || findXcodeWorkspaces(sourceDir, logger);
  if (!xcworkspace) {
    return Promise.resolve(1);
  }

  return runBuild(xcworkspace, buildParams, logger);
}
