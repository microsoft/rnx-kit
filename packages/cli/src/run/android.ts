import type { Config } from "@react-native-community/cli-types";
import * as path from "node:path";
import ora from "ora";
import { buildAndroid } from "../build/android";
import type { AndroidInputParams } from "../build/types";

export async function runAndroid(
  config: Config,
  buildParams: AndroidInputParams
) {
  const logger = ora();

  const projectDir = await buildAndroid(config, buildParams, logger);
  if (typeof projectDir !== "string") {
    return;
  }

  logger.start("Preparing to launch app");

  const { findOutputFile, getPackageName, install, selectDevice, start } =
    await import("@rnx-kit/tools-android");

  const { configuration = "Debug" } = buildParams;
  const apks = findOutputFile(projectDir, configuration);
  if (apks.length === 0) {
    logger.fail("Failed to find the APK that was just built");
    process.exitCode = 1;
    return;
  }

  if (apks.length > 1) {
    const currentStatus = logger.text;
    const choices = apks.map((p) => path.basename(p)).join(", ");
    logger.info(`Multiple APKs were found; picking the first one: ${choices}`);
    logger.info("If this is wrong, remove the others and try again");
    logger.start(currentStatus);
  }

  const apk = apks[0];
  const info = getPackageName(apk);
  if (info instanceof Error) {
    logger.fail(info.message);
    process.exitCode = 1;
    return;
  }

  const device = await selectDevice(buildParams.device, logger);
  if (!device) {
    logger.fail("Failed to launch app: Could not find an appropriate device");
    process.exitCode = 1;
    return;
  }

  logger.start(`Installing ${apk}`);

  const { packageName, activityName } = info;
  const error = await install(device, apk, packageName);
  if (error) {
    logger.fail(error.message);
    process.exitCode = 1;
    return;
  }

  logger.text = `Starting ${packageName}`;
  await start(device, packageName, activityName);

  logger.succeed(`Started ${packageName}`);
}
