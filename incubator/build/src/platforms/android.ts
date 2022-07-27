import { spawn } from "node:child_process";
import { existsSync as fileExists } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Ora } from "ora";
import { idle, retry } from "../async";
import { ensure, makeCommand, makeCommandSync } from "../command";
import { MAX_ATTEMPTS } from "../constants";
import type { BuildParams } from "../types";
import { latestVersion } from "../version";

type EmulatorInfo = {
  product: string;
  model: string;
  device: string;
  transport_id: string;
};

type PhysicalDeviceInfo = {
  usb: string;
  product: string;
  model: string;
  device: string;
  transport_id: string;
};

type DeviceInfo = {
  serial: string;
  state: "offline" | "device" | string;
  description: EmulatorInfo | PhysicalDeviceInfo;
};

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
  return path.join(buildToolsInstallPath, latestVersion(versions));
}

async function getDevices(): Promise<DeviceInfo[]> {
  // https://developer.android.com/studio/command-line/adb#devicestatus
  const { stdout } = await adb("devices", "-l");
  return stdout
    .split("\n")
    .splice(1) // First line is 'List of devices attached'
    .map((device) => {
      const [serial, state, ...props] = device.split(/\s+/);
      return {
        serial,
        state,
        description: Object.fromEntries(
          props.map((prop) => prop.split(":"))
        ) as DeviceInfo["description"],
      };
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

async function launchEmulator(
  emulatorName: string
): Promise<DeviceInfo | Error> {
  spawn(EMULATOR_PATH, ["@" + emulatorName], {
    detached: true,
    stdio: "ignore",
  }).unref();

  const result = await retry(async () => {
    const devices = await getDevices();
    return devices.find((device) => device.state === "device") || null;
  }, MAX_ATTEMPTS);
  return result || new Error("Timed out waiting for the emulator");
}

async function selectDevice(
  emulatorName: string | undefined,
  spinner: Ora
): Promise<DeviceInfo | null> {
  const attachedDevices = await getDevices();
  if (!emulatorName) {
    const physicalDevice = attachedDevices.find(
      (device) => device.state === "device" && "usb" in device.description
    );
    if (physicalDevice) {
      spinner.info(`Found Android device ${physicalDevice.serial}`);
      return physicalDevice;
    }
  }

  // There is currently no way to get the emulator name based on the list of
  // attached devices. If we find an emulator, we'll have to assume it's the
  // one the user wants.
  const attachedEmulator = attachedDevices.find(
    (device) => device.state === "device" && !("usb" in device.description)
  );
  if (attachedEmulator) {
    spinner.info("An Android emulator is already attached");
    return attachedEmulator;
  }

  const avd = emulatorName || (await getEmulators())[0];
  if (!avd) {
    spinner.warn("No emulators were found");
    return null;
  }

  spinner.start(`Booting Android emulator @${avd}`);
  const emulator = await launchEmulator(avd);
  if (emulator instanceof Error) {
    spinner.fail();
    spinner.fail(emulator.message);
    return null;
  }

  spinner.succeed(`Booted @${avd}`);
  return emulator;
}

function start(
  { serial }: DeviceInfo,
  packageName: string,
  activityName: string
) {
  const activity = `${packageName}/${activityName}`;
  return adb("-s", serial, "shell", "am", "start", "-n", activity);
}

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

  const info = await getPackageName(apk);
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
