import type { Config } from "@react-native-community/cli-types";
import * as path from "node:path";
import ora from "ora";
import type { BuildResult, InputParams } from "./apple";
import { runBuild } from "./apple";

export function buildIOS(
  config: Config,
  buildParams: InputParams,
  logger = ora()
): Promise<BuildResult> {
  const { sourceDir, xcodeProject } = config.project.ios ?? {};
  if (!sourceDir || !xcodeProject) {
    logger.fail("No iOS project was found");
    process.exitCode = 1;
    return Promise.resolve(1);
  }

  const { name, path: projectDir } = xcodeProject;
  if (!name?.endsWith(".xcworkspace")) {
    logger.fail(
      "No Xcode workspaces were found; did you forget to run `pod install`?"
    );
    process.exitCode = 1;
    return Promise.resolve(1);
  }

  const xcworkspace = path.resolve(sourceDir, projectDir, name);
  return runBuild(xcworkspace, buildParams, logger);
}
