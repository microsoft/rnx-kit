import type { Config } from "@react-native-community/cli-types";
import * as path from "node:path";
import ora from "ora";
import { buildIOS } from "../build/ios";
import type { InputParams } from "../build/types";

export async function runIOS(config: Config, buildParams: InputParams) {
  const { platform } = buildParams;
  if (platform !== "ios" && platform !== "visionos") {
    throw new Error("Expected iOS/visionOS build configuration");
  }

  const logger = ora();

  const result = await buildIOS(config, buildParams, logger);
  if (!result || typeof result !== "object") {
    return;
  }

  logger.start("Preparing to launch app");

  const {
    getBuildSettings,
    getDevicePlatformIdentifier,
    install,
    launch,
    selectDevice,
  } = await import("@rnx-kit/tools-apple");

  const { destination = "simulator", device: deviceName } = buildParams;
  const deviceOrPlatformIdentifier =
    deviceName ?? getDevicePlatformIdentifier(buildParams);

  const [settings, device] = await Promise.all([
    getBuildSettings(result.xcworkspace, result.args),
    selectDevice(deviceOrPlatformIdentifier, destination, logger),
  ]);

  if (!settings) {
    logger.fail("Failed to launch app: Could not get build settings");
    process.exitCode = 1;
    return;
  }

  if (!device) {
    logger.fail("Failed to launch app: Could not find an appropriate device");
    process.exitCode = 1;
    return;
  }

  const { EXECUTABLE_FOLDER_PATH, FULL_PRODUCT_NAME, TARGET_BUILD_DIR } =
    settings.buildSettings;
  const app = path.join(TARGET_BUILD_DIR, EXECUTABLE_FOLDER_PATH);

  logger.start(`Installing '${FULL_PRODUCT_NAME}' on ${device.name}`);

  const installError = await install(device, app);
  if (installError) {
    logger.fail(installError.message);
    process.exitCode = 1;
    return;
  }

  logger.succeed(`Installed '${FULL_PRODUCT_NAME}' on ${device.name}`);
  logger.start(`Starting '${FULL_PRODUCT_NAME}' on ${device.name}`);

  const launchError = await launch(device, app);
  if (launchError) {
    logger.fail(launchError.message);
    process.exitCode = 1;
    return;
  }

  logger.succeed(`Started '${FULL_PRODUCT_NAME}' on ${device.name}`);
}
