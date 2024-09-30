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
  return import("@rnx-kit/tools-apple").then(
    ({ checkPodsManifestLock, xcodebuild }) => {
      if (!checkPodsManifestLock(xcworkspace)) {
        logger.fail(
          "CocoaPods sandbox is not in sync with the Podfile.lock. Run 'pod install' or update your CocoaPods installation."
        );
        return Promise.resolve(1);
      }

      const log = (message: string) => logger.info(message);
      const build = xcodebuild(xcworkspace, buildParams, log);
      return watch(build, logger, () => ({
        xcworkspace,
        args: build.spawnargs,
      }));
    }
  );
}
