import { idle } from "@rnx-kit/tools-shell/async";
import { makeCommandSync } from "@rnx-kit/tools-shell/command";
import * as path from "node:path";
import { adb, getBuildToolsPath } from "./sdk.js";
import type { DeviceInfo, PackageInfo } from "./types.js";

/**
 * Returns the package name and the first launchable activity of the
 * specified APK.
 */
export function getPackageName(apk: string): PackageInfo | Error {
  const buildToolsPath = getBuildToolsPath();
  if (!buildToolsPath) {
    return new Error("Could not find Android SDK Build-Tools");
  }

  const aapt = makeCommandSync(path.join(buildToolsPath, "aapt2"));

  const { stdout } = aapt("dump", "badging", apk);
  const packageMatch = stdout.match(/package: name='(.*?)'/);
  if (!packageMatch) {
    return new Error("Could not find package name");
  }

  const activityMatch = stdout.match(/launchable-activity: name='(.*?)'/);
  if (!activityMatch) {
    return new Error("Could not find any launchable activities");
  }

  return { packageName: packageMatch[1], activityName: activityMatch[1] };
}

/**
 * Installs the specified APK on specified emulator or physical device.
 *
 * @remarks
 * This function automatically uninstalls the existing app if an
 * `INSTALL_FAILED_UPDATE_INCOMPATIBLE` error is encountered.
 */
export async function install(
  device: DeviceInfo,
  apk: string,
  packageName: string
): Promise<Error | null> {
  const { stderr, status } = await adb("-s", device.serial, "install", apk);
  if (status !== 0) {
    if (stderr.includes("device offline")) {
      await idle(1000);
      return install(device, apk, packageName);
    } else if (stderr.includes("INSTALL_FAILED_UPDATE_INCOMPATIBLE")) {
      await adb("uninstall", packageName);
      return install(device, apk, packageName);
    }
    return new Error(stderr);
  }

  return null;
}

/**
 * Starts the specified activity on specified emulator or physical device.
 * @param options
 * @param packageName
 * @param activityName
 */
export function start(
  { serial }: DeviceInfo,
  packageName: string,
  activityName: string
) {
  const activity = `${packageName}/${activityName}`;
  return adb("-s", serial, "shell", "am", "start", "-n", activity);
}
