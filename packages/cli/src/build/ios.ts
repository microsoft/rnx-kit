import type { Config } from "@react-native-community/cli-types";
import { invalidateState } from "@rnx-kit/tools-react-native/cache";
import * as path from "node:path";
import ora from "ora";
import type { BuildResult } from "./apple.ts";
import { runBuild } from "./apple.ts";
import type { AppleInputParams } from "./types.ts";

export function buildIOS(
  config: Config,
  buildParams: AppleInputParams,
  logger = ora()
): Promise<BuildResult> {
  const { platform } = buildParams;
  if (process.platform !== "darwin") {
    logger.fail(`${platform} builds can only be performed on macOS hosts`);
    return Promise.resolve(1);
  }

  const { sourceDir, xcodeProject } = config.project[platform] ?? {};
  if (!sourceDir || !xcodeProject) {
    invalidateState();
    process.exitCode = 1;
    const root = platform.substring(0, platform.length - 2);
    logger.fail(
      `No ${root}OS project was found; did you forget to run 'pod install'?`
    );
    return Promise.resolve(1);
  }

  const { name, path: projectDir } = xcodeProject;
  if (!name?.endsWith(".xcworkspace")) {
    invalidateState();
    process.exitCode = 1;
    logger.fail(
      "No Xcode workspaces were found; did you forget to run `pod install`?"
    );
    return Promise.resolve(1);
  }

  const xcworkspace = projectDir
    ? path.resolve(sourceDir, projectDir, name)
    : path.resolve(sourceDir, name);
  return runBuild(xcworkspace, buildParams, logger);
}
