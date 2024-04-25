import { idle, retry } from "@rnx-kit/tools-shell/async";
import {
  ensure,
  makeCommand,
  makeCommandSync,
} from "@rnx-kit/tools-shell/command";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

type Logger = {
  start: (str?: string) => void;
  succeed: (str?: string) => void;
  fail: (str?: string) => void;
  info: (str: string) => void;
  warn: (str: string) => void;
};

export type EmulatorInfo = {
  product: string;
  model: string;
  device: string;
  transport_id: string;
};

export type PhysicalDeviceInfo = {
  usb: string;
  product: string;
  model: string;
  device: string;
  transport_id: string;
};

export type DeviceInfo = {
  serial: string;
  state: "offline" | "device" | string;
  description: EmulatorInfo | PhysicalDeviceInfo;
};

export type PackageInfo = {
  packageName: string;
  activityName: string;
};

const ANDROID_HOME = (() => {
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
const EMULATOR_BIN = path.join(ANDROID_HOME, "emulator", "emulator");
const MAX_ATTEMPTS = 8;

const adb = makeCommand(ADB_BIN);

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

/**
 * Returns a list of attached physical Android devices.
 */
export async function getDevices(): Promise<DeviceInfo[]> {
  // https://developer.android.com/studio/command-line/adb#devicestatus
  const { stdout } = await adb("devices", "-l");
  return stdout
    .split("\n")
    .splice(1) // First line is 'List of devices attached'
    .map((device: string) => {
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

/**
 * Returns a list of available Android virtual devices.
 */
export async function getEmulators(): Promise<string[]> {
  const emulator = makeCommand(EMULATOR_BIN);
  const result = await emulator("-list-avds");
  return ensure(result)
    .split("\n")
    .map((device: string) => device.trim())
    .filter(Boolean);
}

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
    return new Error("Could not find launchable activity");
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
 * Launches the emulator with the specified name.
 */
export async function launchEmulator(
  emulatorName: string
): Promise<DeviceInfo | Error> {
  spawn(EMULATOR_BIN, ["@" + emulatorName], {
    detached: true,
    stdio: "ignore",
  }).unref();

  const result = await retry(async () => {
    const devices = await getDevices();
    return devices.find((device) => device.state === "device") || null;
  }, MAX_ATTEMPTS);
  return result || new Error("Timed out waiting for the emulator");
}

/**
 * Returns the emulator or physical device with the specified name.
 *
 * @remarks
 * If an emulator is found, it is also booted if necessary.
 */
export async function selectDevice(
  emulatorName: string | undefined,
  logger: Logger
): Promise<DeviceInfo | null> {
  const attachedDevices = await getDevices();
  if (!emulatorName) {
    const physicalDevice = attachedDevices.find(
      (device) => device.state === "device" && "usb" in device.description
    );
    if (physicalDevice) {
      logger.info(`Found Android device ${physicalDevice.serial}`);
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
    logger.info("An Android emulator is already attached");
    return attachedEmulator;
  }

  const avd = emulatorName || (await getEmulators())[0];
  if (!avd) {
    logger.warn("No emulators were found");
    return null;
  }

  logger.start(`Booting Android emulator @${avd}`);
  const emulator = await launchEmulator(avd);
  if (emulator instanceof Error) {
    logger.fail();
    logger.fail(emulator.message);
    return null;
  }

  logger.succeed(`Booted @${avd}`);
  return emulator;
}

/**
 * Starts the specified activity on specified emulator or physical device.
 */
export function start(
  { serial }: DeviceInfo,
  packageName: string,
  activityName: string
) {
  const activity = `${packageName}/${activityName}`;
  return adb("-s", serial, "shell", "am", "start", "-n", activity);
}
