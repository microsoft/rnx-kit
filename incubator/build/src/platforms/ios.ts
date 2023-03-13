import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";
import type { Ora } from "ora";
import { untar } from "../archive.js";
import { retry } from "../async.js";
import {
  ensure,
  ensureInstalled,
  makeCommand,
  makeCommandSync,
} from "../command.js";
import type { BuildParams, DeviceType, JSObject } from "../types.js";
import { open } from "./macos.js";

type Device = {
  simulator: boolean;
  operatingSystemVersion: string;
  interface?: string;
  available: boolean;
  platform:
    | "com.apple.platform.appletvos"
    | "com.apple.platform.appletvsimulator"
    | "com.apple.platform.driverkit"
    | "com.apple.platform.iphoneos"
    | "com.apple.platform.iphonesimulator"
    | "com.apple.platform.macosx"
    | "com.apple.platform.watchos"
    | "com.apple.platform.watchsimulator";
  modelCode: string;
  identifier: string;
  architecture: "arm64" | "arm64e" | "x86_64" | "x86_64h";
  modelUTI: string;
  modelName: string;
  name: string;
};

type Simulator = {
  name: string;
  state: "Booted" | "Shutdown";
  deviceTypeIdentifier: string;
  isAvailable: boolean;
  udid: string;
  logPath: string;
  dataPathSize: number;
  dataPath: string;
  availabilityError?: string;
};

const iosDeploy = makeCommand("ios-deploy");
const xcrun = makeCommand("xcrun");

async function getAvailableSimulators(
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

function getDeveloperDirectory(): string | undefined {
  const xcodeSelect = makeCommandSync("xcode-select");

  const { stdout, status } = xcodeSelect("--print-path");
  return status === 0 ? stdout.trim() : undefined;
}

async function getDevices(): Promise<Device[]> {
  const { stdout, status } = await xcrun("xcdevice", "list");
  if (status !== 0) {
    return [];
  }

  return JSON.parse(stdout);
}

async function parsePlist(app: string): Promise<Error | JSObject> {
  const plutil = makeCommand("plutil");

  const infoPlist = path.join(app, "Info.plist");
  const convertPlist = plutil("-convert", "json", "-o", "-", infoPlist);
  const { stdout, status } = await convertPlist;
  return status === 0
    ? JSON.parse(stdout)
    : new Error(`Failed to parse 'Info.plist' of '${app}'`);
}

function pickSimulator(
  simulators: Record<string, Simulator[]>
): Simulator | null {
  const runtimes = Object.keys(simulators);
  const runtime = runtimes[runtimes.length - 1];
  const deviceList = simulators[runtime];
  return deviceList[deviceList.length - 1];
}

async function bootSimulator({ udid }: Simulator): Promise<Error | null> {
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

async function install(device: Device, app: string): Promise<Error | null> {
  const { simulator, identifier } = device;
  const install = simulator
    ? () => xcrun("simctl", "install", identifier, app)
    : () => iosDeploy("--id", identifier, "--bundle", app);

  const { stderr, status } = await install();
  return status === 0 ? null : new Error(stderr);
}

async function launch(device: Device, app: string): Promise<Error | null> {
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

async function selectDevice(
  deviceName: string | undefined,
  deviceType: DeviceType,
  spinner: Ora
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
          `Failed to find ${device} - please make sure it is properly plugged in.\n\nPress any key to try again`,
          resolve
        )
      );
      prompt.close();
      return selectDevice(deviceName, deviceType, spinner);
    }

    const { operatingSystemVersion, name } = physicalDevice;
    spinner.info(`Found ${name} (${operatingSystemVersion})`);
    return physicalDevice;
  }

  const device = deviceName
    ? devices.find(({ simulator, name }) => simulator && name === deviceName)
    : devices.reverse().find(({ simulator, available, modelName }) => {
        return simulator && available && /^iPhone \d\d$/.test(modelName);
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
    spinner.fail(message);
    return null;
  }

  const availableSimulators = await getAvailableSimulators(device.identifier);
  for (const simulators of Object.values(availableSimulators)) {
    for (const simulator of simulators) {
      const { name, state, udid } = simulator;
      if (udid === device.identifier) {
        if (state !== "Booted") {
          spinner.start(`Booting ${name} simulator`);
          const error = await bootSimulator(simulator);
          if (error) {
            spinner.fail();
            spinner.fail(error.message);
            return null;
          }
          spinner.succeed(`Booted ${name} simulator`);
        } else {
          spinner.info(`${name} simulator has already been booted`);
        }
        return device;
      }
    }
  }

  throw new Error(`Failed to find simulator: ${device.identifier}`);
}

export async function deploy(
  archive: string,
  { deviceName, deviceType }: BuildParams,
  spinner: Ora
): Promise<void> {
  if (os.platform() !== "darwin") {
    return;
  }

  const developerDir = getDeveloperDirectory();
  if (!developerDir) {
    spinner.warn("Xcode is required to install and launch apps");
    return;
  }

  const device = await selectDevice(deviceName, deviceType, spinner);
  if (!device) {
    return;
  }

  if (!device.simulator) {
    await ensureInstalled(
      () => iosDeploy("--version"),
      `ios-deploy is required to install and launch apps on devices.\nInstall ios-deploy via Homebrew by running:\n\n    brew install ios-deploy\n\nPress any key to continue`
    );
  } else {
    await open(path.join(developerDir, "Applications", "Simulator.app"));
  }

  spinner.start(`Extracting ${archive}`);
  const app = await untar(archive);

  spinner.text = `Installing ${app}`;
  const installError = await install(device, app);
  if (installError) {
    spinner.fail();
    spinner.fail(installError.message);
    return;
  }

  spinner.text = `Launching ${app}`;
  const launchError = await launch(device, app);
  if (launchError) {
    spinner.fail();
    spinner.fail(launchError.message);
    return;
  }

  spinner.succeed(`Launched ${app}`);
}
