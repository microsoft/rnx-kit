import type { Ora } from "ora";
import type { AppleBuildParams } from "./types";

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
      logger.start("Building");

      const errors: Buffer[] = [];
      const proc = xcodebuild(xcworkspace, buildParams, (text) => {
        const current = logger.text;
        logger.info(text);
        logger.start(current);
      });

      proc.stdout.on("data", () => (logger.text += "."));
      proc.stderr.on("data", (data) => errors.push(data));

      proc.on("close", (code) => {
        if (code === 0) {
          logger.succeed("Build succeeded");
          resolve({ xcworkspace, args: proc.spawnargs });
        } else {
          logger.fail(Buffer.concat(errors).toString());
          process.exitCode = code ?? 1;
          resolve(code);
        }
      });
    });
  });
}
