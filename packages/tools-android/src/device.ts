import { retry } from "@rnx-kit/tools-shell/async";
import { ensure, makeCommand } from "@rnx-kit/tools-shell/command";
import { spawn } from "node:child_process";
import * as path from "node:path";
import { adb, ANDROID_HOME } from "./sdk.js";
import type { DeviceInfo, Logger } from "./types.js";

const EMULATOR_BIN = path.join(ANDROID_HOME, "emulator", "emulator");
const MAX_ATTEMPTS = 8;

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

  // Make sure we don't include lines like:
  //     INFO    | Storing crashdata in: /tmp/android-user/emu-crash-34.2.13.db
  return ensure(result)
    .split("\n")
    .map((device: string) => device.trim())
    .filter((line) => line && !line.includes(" | "));
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
