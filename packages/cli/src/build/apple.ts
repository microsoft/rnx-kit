import type { AppleBuildParams } from "./types.ts";
import type { Logger } from "./watcher.ts";
import { watch } from "./watcher.ts";

export type BuildArgs = {
  xcworkspace: string;
  args: string[];
};

export type BuildResult = BuildArgs | number | null;

export function runBuild(
  xcworkspace: string,
  buildParams: AppleBuildParams,
  logger: Logger
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
      return watch(build, logger, buildParams.verbose, () => ({
        xcworkspace,
        args: build.spawnargs,
      }));
    }
  );
}
