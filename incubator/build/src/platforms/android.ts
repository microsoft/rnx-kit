import { spawn } from "node:child_process";
import { existsSync as fileExists } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Ora } from "ora";
import { idle, retry } from "../async";
import { ensure, makeCommand, makeCommandSync } from "../command";

type PackageInfo = {
  packageName: string;
  activityName: string;
};

const ANDROID_HOME = process.env.ANDROID_HOME || "";
const ADB_PATH = path.join(ANDROID_HOME, "platform-tools", "adb");
const EMULATOR_PATH = path.join(ANDROID_HOME, "emulator", "emulator");

const adb = makeCommand(ADB_PATH);

async function getBuildToolsPath(): Promise<string | null> {
  const buildToolsInstallPath = path.join(ANDROID_HOME, "build-tools");
  if (!fileExists(buildToolsInstallPath)) {
    return null;
  }

  const versions = await fs.readdir(buildToolsInstallPath);

  let latestVersion = "0.0.0";
  let maxValue = 0;

  for (const version of versions) {
    const [major, minor, patch] = version.split(".");
    const value =
      parseInt(major, 10) * 10000 +
      parseInt(minor, 10) * 100 +
      parseInt(patch, 10);
    if (maxValue < value) {
      latestVersion = version;
    }
  }

  return path.join(buildToolsInstallPath, latestVersion);
}

async function getDevices(): Promise<[string, string][]> {
  const { stdout } = await adb("devices");
  return stdout
    .split("\n")
    .splice(1)
    .map((device) => {
      const [name, state] = device.split("\t");
      return [name, state];
    });
}

async function getEmulators(): Promise<string[]> {
  const emulator = makeCommand(EMULATOR_PATH);
  const result = await emulator("-list-avds");
  return ensure(result)
    .split("\n")
    .map((device) => device.trim())
    .filter(Boolean);
}

async function getPackageName(apk: string): Promise<PackageInfo | Error> {
  const buildToolsPath = await getBuildToolsPath();
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
    return new Error("Could not find launchable activity");
  }

  return { packageName: packageMatch[1], activityName: activityMatch[1] };
}

async function install(
  filename: string,
  packageName: string
): Promise<Error | null> {
  const { stderr, status } = await adb("install", filename);
  if (status !== 0) {
    if (stderr.includes("device offline")) {
      await idle(1000);
      return install(filename, packageName);
    } else if (stderr.includes("INSTALL_FAILED_UPDATE_INCOMPATIBLE")) {
      await adb("uninstall", packageName);
      return install(filename, packageName);
    }

    return new Error(stderr);
  }
  return null;
}

async function launchEmulator(emulatorName: string): Promise<Error | null> {
  spawn(EMULATOR_PATH, ["@" + emulatorName], {
    detached: true,
    stdio: "ignore",
  }).unref();

  const result = await retry(async () => {
    const devices = await getDevices();
    return devices.some(([, state]) => state === "device") || null;
  }, 4);
  return result ? null : new Error("Timed out waiting for the emulator");
}

function start(packageName: string, activityName: string) {
  return adb("shell", "am", "start", "-n", `${packageName}/${activityName}`);
}

export async function installAndLaunchApk(
  apk: string,
  emulatorName: string | undefined,
  spinner: Ora
): Promise<void> {
  if (!ANDROID_HOME) {
    spinner.warn(
      "ANDROID_HOME is not set and is required to install and launch APKs"
    );
    return;
  }

  if (emulatorName) {
    spinner.start(`Booting Android emulator @${emulatorName}`);
    const error = await launchEmulator(emulatorName);
    if (error) {
      spinner.fail(error.message);
      return;
    }
    spinner.succeed(`Booted @${emulatorName}`);
  } else {
    const devices = await getDevices();
    if (devices.some(([, state]) => state === "device")) {
      spinner.info("An Android device is already connected");
    } else {
      const emulators = await getEmulators();
      if (emulators.length === 0) {
        spinner.warn("No emulators were found");
        return;
      }

      const emulatorName = emulators[0];
      spinner.start(`Booting Android emulator @${emulatorName}`);
      const error = await launchEmulator(emulatorName);
      if (error) {
        spinner.fail(error.message);
        return;
      }
      spinner.succeed(`Booted @${emulatorName}`);
    }
  }

  const info = await getPackageName(apk);
  if (info instanceof Error) {
    spinner.fail(info.message);
    return;
  }

  const { packageName, activityName } = info;

  spinner.start(`Installing ${apk}`);
  const error = await install(apk, packageName);
  if (error) {
    spinner.fail(error.message);
    return;
  }

  spinner.text = `Starting ${packageName}`;
  await start(packageName, activityName);

  spinner.succeed(`Started ${packageName}`);
}
