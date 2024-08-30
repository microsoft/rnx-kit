import type { Config } from "@react-native-community/cli-types";
import * as path from "node:path";
import ora from "ora";
import { buildMacOS } from "../build/macos";
import type { AppleInputParams } from "../build/types";

export async function runMacOS(config: Config, buildParams: AppleInputParams) {
  const logger = ora();

  const result = await buildMacOS(config, buildParams, logger);
  if (!result || typeof result !== "object") {
    return;
  }

  const { getBuildSettings, open } = await import("@rnx-kit/tools-apple");

  logger.start("Launching app");

  const settings = await getBuildSettings(result.xcworkspace, result.args);
  if (!settings) {
    logger.fail("Failed to launch app: Could not get build settings");
    process.exitCode = 1;
    return;
  }

  const { FULL_PRODUCT_NAME, TARGET_BUILD_DIR } = settings.buildSettings;
  const appPath = path.join(TARGET_BUILD_DIR, FULL_PRODUCT_NAME);

  logger.text = `Launching '${FULL_PRODUCT_NAME}'`;

  const { stderr, status } = await open(appPath);
  if (status !== 0) {
    logger.fail(`Failed to launch app: ${stderr}`);
    process.exitCode = status ?? 1;
  } else {
    logger.succeed(`Launched '${FULL_PRODUCT_NAME}'`);
  }
}
