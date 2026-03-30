import { makeCommand } from "@rnx-kit/tools-shell/command";
import * as fs from "node:fs";
import * as path from "node:path";

export const ANDROID_HOME = (() => {
  const home = process.env.ANDROID_HOME;
  if (!home) {
    throw new Error(
      "ANDROID_HOME is not set and is required to install and launch APKs"
    );
  }
  return home;
})();

const ADB_BIN = path.join(ANDROID_HOME, "platform-tools", "adb");
const BUILD_TOOLS_DIR = path.join(ANDROID_HOME, "build-tools");

export const adb = makeCommand(ADB_BIN);

function latestVersion(versions: string[]): string {
  let latestVersion = "0.0.0";
  let maxValue = 0;

  for (const version of versions) {
    const [major, minor = 0, patch = 0] = version.split(".");
    const value =
      Number(major) * 1000000 + Number(minor) * 1000 + Number(patch);
    if (maxValue < value) {
      latestVersion = version;
      maxValue = value;
    }
  }

  return latestVersion;
}

/**
 * Returns the path to Android SDK Build-Tools.
 */
export function getBuildToolsPath(): string | null {
  if (!fs.existsSync(BUILD_TOOLS_DIR)) {
    return null;
  }

  const versions = fs.readdirSync(BUILD_TOOLS_DIR);
  return path.join(BUILD_TOOLS_DIR, latestVersion(versions));
}
