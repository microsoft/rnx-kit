import type { Ora } from "ora";
import type { AppleBuildParams } from "./types";
import { watch } from "./watcher";

export type BuildArgs = {
  xcworkspace: string;
  args: string[];
};

export type BuildResult = BuildArgs | number | null;

export function runBuild(
  xcworkspace: string,
  buildParams: AppleBuildParams,
  logger: Ora
): Promise<BuildResult> {
  return import("@rnx-kit/tools-apple").then(({ xcodebuild }) => {
    return new Promise<BuildResult>((resolve) => {
      const onSuccess = () => resolve({ xcworkspace, args: build.spawnargs });
      const build = xcodebuild(xcworkspace, buildParams, (text) => {
        logger.info(text);
      });
      watch(build, logger, onSuccess, resolve);
    });
  });
}
