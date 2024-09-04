import type { Config } from "@react-native-community/cli-types";
import { invalidateState } from "@rnx-kit/tools-react-native/cache";
import ora from "ora";
import type { AndroidBuildParams } from "./types";
import { watch } from "./watcher";

export type BuildResult = string | number | null;

export function buildAndroid(
  config: Config,
  buildParams: AndroidBuildParams,
  logger = ora()
): Promise<BuildResult> {
  const { sourceDir } = config.project.android ?? {};
  if (!sourceDir) {
    invalidateState();
    process.exitCode = 1;
    logger.fail("No Android project was found");
    return Promise.resolve(null);
  }

  return import("@rnx-kit/tools-android").then(({ assemble }) => {
    return new Promise<BuildResult>((resolve) => {
      const gradle = assemble(sourceDir, buildParams);
      watch(gradle, logger, () => resolve(sourceDir), resolve);
    });
  });
}
