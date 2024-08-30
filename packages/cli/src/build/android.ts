import type { Config } from "@react-native-community/cli-types";
import ora from "ora";
import type { AndroidBuildParams } from "./types";

export async function buildAndroid(
  config: Config,
  buildParams: AndroidBuildParams,
  logger = ora()
): Promise<string | number | null> {
  const { sourceDir } = config.project.android ?? {};
  if (!sourceDir) {
    logger.fail("No Android project was found");
    process.exitCode = 1;
    return null;
  }

  return import("@rnx-kit/tools-android").then(({ assemble }) => {
    return new Promise((resolve) => {
      logger.start("Building");

      const errors: Buffer[] = [];
      const gradle = assemble(sourceDir, buildParams);

      gradle.stdout.on("data", () => (logger.text += "."));
      gradle.stderr.on("data", (data) => errors.push(data));

      gradle.on("close", (code) => {
        if (code === 0) {
          logger.succeed("Build succeeded");
          resolve(sourceDir);
        } else {
          logger.fail(Buffer.concat(errors).toString());
          process.exitCode = code ?? 1;
          resolve(code);
        }
      });
    });
  });
}
