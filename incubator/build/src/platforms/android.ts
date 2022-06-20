import { spawn } from "node:child_process";
import { existsSync as fileExists } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Ora } from "ora";
import { idle } from "../async";
import { ensure, makeCommand, makeCommandSync } from "../command";

const ANDROID_HOME = process.env.ANDROID_HOME || "";
const ADB_PATH = path.join(ANDROID_HOME, "platform-tools", "adb");
const EMULATOR_PATH = path.join(ANDROID_HOME, "emulator", "emulator");

const adb = makeCommand(ADB_PATH);

async function getBuildToolsPath(): Promise<string> {
  const buildToolsInstallPath = path.join(ANDROID_HOME, "build-tools");
  if (!fileExists(buildToolsInstallPath)) {
    throw new Error("Could not find Android SDK Build-Tools");
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

async function getPackageName(apk: string): Promise<[string, string]> {
  const buildToolsPath = await getBuildToolsPath();
  const aapt = makeCommandSync(path.join(buildToolsPath, "aapt2"));

  const { stdout } = aapt("dump", "badging", apk);
  const packageMatch = stdout.match(/package: name='(.*?)'/);
  if (!packageMatch) {
    throw new Error("Could not find package name");
  }

  const activityMatch = stdout.match(/launchable-activity: name='(.*?)'/);
  if (!activityMatch) {
    throw new Error("Could not find launchable activity");
  }

  return [packageMatch[1], activityMatch[1]];
}

async function install(filename: string, packageName: string): Promise<void> {
  const { stderr, status } = await adb("install", filename);
  if (status !== 0) {
    if (stderr.includes("device offline")) {
      await idle(1000);
      return install(filename, packageName);
    } else if (stderr.includes("INSTALL_FAILED_UPDATE_INCOMPATIBLE")) {
      await adb("uninstall", packageName);
      return install(filename, packageName);
    }

    throw new Error(stderr);
  }
}

async function launchEmulator(emulatorName: string): Promise<void> {
  spawn(EMULATOR_PATH, ["@" + emulatorName], {
    detached: true,
    stdio: "ignore",
  }).unref();

  while (emulatorName) {
    const devices = await getDevices();
    if (devices.some(([, state]) => state === "device")) {
      break;
    }

    await idle(1000);
  }
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
    await launchEmulator(emulatorName);
    spinner.succeed(`Booted @${emulatorName}`);
  } else {
    const devices = await getDevices();
    if (devices.some(([, state]) => state === "device")) {
      spinner.info("An Android device is already connected");
    } else {
      const emulators = await getEmulators();
      const emulatorName = emulators[0];
      spinner.start(`Booting Android emulator @${emulatorName}`);
      await launchEmulator(emulatorName);
      spinner.succeed(`Booted @${emulatorName}`);
    }
  }

  const [packageName, activityName] = await getPackageName(apk);

  spinner.start(`Installing ${apk}`);
  await install(apk, packageName);
  spinner.succeed(`Installed ${apk}`);

  spinner.start(`Starting ${packageName}`);
  await start(packageName, activityName);
  spinner.succeed(`Started ${packageName}`);
}
