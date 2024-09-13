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
    const log = (message: string) => logger.info(message);
    const build = xcodebuild(xcworkspace, buildParams, log);
    return watch(build, logger, () => ({ xcworkspace, args: build.spawnargs }));
  });
}
