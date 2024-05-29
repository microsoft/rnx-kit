import { retry } from "@rnx-kit/tools-shell/async";
import { ensure, makeCommand } from "@rnx-kit/tools-shell/command";
import * as readline from "node:readline";
import type { Device, DeviceType, Logger, Simulator } from "./types.js";
import { parsePlist, xcrun } from "./xcode.js";

export const iosDeploy = makeCommand("ios-deploy");

/**
 * Returns a list of available iOS simulators.
 */
export async function getAvailableSimulators(
  search = "iPhone"
): Promise<Record<string, Simulator[]>> {
  const ls = xcrun("simctl", "list", "--json", "devices", search, "available");
  const { devices } = JSON.parse(ensure(await ls));
  return Object.keys(devices)
    .sort()
    .reduce<Record<string, Simulator[]>>((filtered, runtime) => {
      const simulators = devices[runtime];
      if (simulators.length > 0) {
        filtered[runtime] = simulators;
      }
      return filtered;
    }, {});
}

/**
 * Returns a list of available iOS simulators and physical devices.
 */
export async function getDevices(): Promise<Device[]> {
  const { stdout, status } = await xcrun("xcdevice", "list");
  if (status !== 0) {
    return [];
  }

  return JSON.parse(stdout);
}

function pickSimulator(
  simulators: Record<string, Simulator[]>
): Simulator | null {
  const runtimes = Object.keys(simulators);
  const runtime = runtimes[runtimes.length - 1];
  const deviceList = simulators[runtime];
  return deviceList[deviceList.length - 1];
}

/**
 * Boots the simulator with the specified UDID.
 */
export async function bootSimulator(
  simulator: Simulator
): Promise<Error | null> {
  const { udid } = simulator;
  const { stderr, status } = await xcrun("simctl", "boot", udid);
  if (status !== 0) {
    return new Error(stderr);
  }

  const result = await retry(async () => {
    const simulators = await getAvailableSimulators(udid);
    const device = pickSimulator(simulators);
    return device?.state === "Booted" || null;
  }, 4);
  return result ? null : new Error("Timed out waiting for the simulator");
}

/**
 * Installs the specified app bundle on specified simulator or physical device.
 */
export async function install(
  device: Device,
  app: string
): Promise<Error | null> {
  const { simulator, identifier } = device;
  const install = simulator
    ? () => xcrun("simctl", "install", identifier, app)
    : () => iosDeploy("--id", identifier, "--bundle", app);

  const { stderr, status } = await install();
  return status === 0 ? null : new Error(stderr);
}

/**
 * Launches the specified app bundle on specified simulator or physical device.
 */
export async function launch(
  device: Device,
  app: string
): Promise<Error | null> {
  const { simulator, identifier } = device;
  if (!simulator) {
    const launch = iosDeploy(
      "--id",
      identifier,
      "--bundle",
      app,
      "--justlaunch",
      "--noinstall"
    );
    const { stdout, status } = await launch;
    if (status !== 0) {
      const m = stdout.match(/error: (.*?)$/m);
      return new Error(m ? m[1] : "Failed to launch app");
    }
  } else {
    const result = await parsePlist(app);
    if (result instanceof Error) {
      return result;
    }

    const { CFBundleIdentifier } = result;
    if (typeof CFBundleIdentifier !== "string") {
      return new Error(`Invalid bundle identifier: ${CFBundleIdentifier}`);
    }

    const launch = xcrun("simctl", "launch", identifier, CFBundleIdentifier);
    const { stderr, status } = await launch;
    if (status !== 0) {
      return new Error(stderr);
    }
  }

  return null;
}

/**
 * Returns the simulator or physical device with the specified name.
 *
 * @remarks
 * If a simulator is found, it is also booted if necessary
 */
export async function selectDevice(
  deviceName: string | undefined,
  deviceType: DeviceType,
  logger: Logger
): Promise<Device | null> {
  const devices = await getDevices();

  if (deviceType === "device") {
    const search: (device: Device) => boolean = deviceName
      ? ({ simulator, name }) => !simulator && name === deviceName
      : ({ simulator, platform }) =>
          !simulator && platform === "com.apple.platform.iphoneos";
    const physicalDevice = devices.find(search);
    if (!physicalDevice) {
      // Device detection can sometimes be flaky. Prompt the user to make sure
      // a device is properly plugged in, and try again.
      const prompt = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const device = deviceName ? `device: ${deviceName}` : "a physical device";
      await new Promise((resolve) =>
        prompt.question(
          `Failed to find ${device} — please make sure it is properly plugged in.\n\nPress any key to try again`,
          resolve
        )
      );
      prompt.close();
      return selectDevice(deviceName, deviceType, logger);
    }

    const { operatingSystemVersion, name } = physicalDevice;
    logger.info(`Found ${name} (${operatingSystemVersion})`);
    return physicalDevice;
  }

  const device = deviceName
    ? devices.find(({ simulator, name }) => simulator && name === deviceName)
    : devices.reverse().find(({ simulator, available, modelName }) => {
        return (
          simulator && available && /^iPhone \d\d(?: Pro)?$/.test(modelName)
        );
      });
  if (!device) {
    const foundDevices = devices
      .reduce<string[]>((list, device) => {
        const { simulator, operatingSystemVersion, available, modelName } =
          device;
        if (simulator && available) {
          list.push(`${modelName} (${operatingSystemVersion})`);
        }
        return list;
      }, [])
      .sort();
    const message = [
      deviceName
        ? `Failed to find ${deviceName} simulator:`
        : "Failed to find an iPhone simulator:",
      ...foundDevices,
    ].join("\n\t- ");
    logger.fail(message);
    return null;
  }

  const availableSimulators = await getAvailableSimulators(device.identifier);
  for (const simulators of Object.values(availableSimulators)) {
    for (const simulator of simulators) {
      const { name, state, udid } = simulator;
      if (udid === device.identifier) {
        if (state !== "Booted") {
          logger.start(`Booting ${name} simulator`);
          const error = await bootSimulator(simulator);
          if (error) {
            logger.fail();
            logger.fail(error.message);
            return null;
          }
          logger.succeed(`Booted ${name} simulator`);
        } else {
          logger.info(`${name} simulator has already been booted`);
        }
        return device;
      }
    }
  }

  throw new Error(`Failed to find simulator: ${device.identifier}`);
}
