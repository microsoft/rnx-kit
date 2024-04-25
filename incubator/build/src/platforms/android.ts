import {
  getPackageName,
  install,
  selectDevice,
  start,
} from "@rnx-kit/tools-android";
import type { Ora } from "ora";
import type { BuildParams } from "../types.js";

const ANDROID_HOME = process.env.ANDROID_HOME || "";

export async function deploy(
  apk: string,
  { emulatorName }: BuildParams,
  spinner: Ora
): Promise<void> {
  if (!ANDROID_HOME) {
    spinner.warn(
      "ANDROID_HOME is not set and is required to install and launch APKs"
    );
    return;
  }

  const device = await selectDevice(emulatorName, spinner);
  if (!device) {
    return;
  }

  const info = getPackageName(apk);
  if (info instanceof Error) {
    spinner.fail(info.message);
    return;
  }

  const { packageName, activityName } = info;

  spinner.start(`Installing ${apk}`);
  const error = await install(device, apk, packageName);
  if (error) {
    spinner.fail();
    spinner.fail(error.message);
    return;
  }

  spinner.text = `Starting ${packageName}`;
  await start(device, packageName, activityName);

  spinner.succeed(`Started ${packageName}`);
}
