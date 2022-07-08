import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";
import type { Ora } from "ora";
import { untar } from "../archive";
import { retry } from "../async";
import {
  ensure,
  ensureInstalled,
  makeCommand,
  makeCommandSync,
} from "../command";
import type { BuildParams, DeviceType, JSObject } from "../types";
import { open } from "./macos";

type Device = {
  name: string;
  type: "device" | "simulator" | "unknown";
  osVersion: string;
  accessories?: Device[];
  udid: string;
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
  const { stdout, stderr, status } = await xcrun("xctrace", "list", "devices");
  if (status !== 0) {
    return [];
  }

  const devices: Device[] = [];

  /**
   * As of Xcode 13.4.1, the output may look like this:
   *
   * % xcrun xctrace list devices
   * == Devices ==
   * Arnold’s MacBook Pro 2019 (00000000-0000-0000-0000-000000000000)
   * Arnold’s iPhone (15.5) (00000000-0000000000000000)
   *
   * == Simulators ==
   * Apple TV Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * Apple TV 4K (2nd generation) Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * Apple TV 4K (at 1080p) (2nd generation) Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPad (9th generation) Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPad Air (4th generation) Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPad Air (5th generation) Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPad Pro (11-inch) (3rd generation) Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPad Pro (12.9-inch) (5th generation) Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPad Pro (9.7-inch) Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPad mini (6th generation) Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 11 Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 11 Pro Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 11 Pro Max Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 12 Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 12 Pro Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 12 Pro Simulator (15.5) + Apple Watch Series 5 - 40mm (8.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 12 Pro Max Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 12 Pro Max Simulator (15.5) + Apple Watch Series 5 - 44mm (8.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 12 mini Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 13 Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 13 Simulator (15.5) + Apple Watch Series 7 - 45mm (8.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 13 Pro Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 13 Pro Simulator (15.5) + Apple Watch Series 6 - 40mm (8.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 13 Pro Max Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 13 Pro Max Simulator (15.5) + Apple Watch Series 6 - 44mm (8.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 13 mini Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 13 mini Simulator (15.5) + Apple Watch Series 7 - 41mm (8.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 8 Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone 8 Plus Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone SE (2nd generation) Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPhone SE (3rd generation) Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   * iPod touch (7th generation) Simulator (15.5) (00000000-0000-0000-0000-000000000000)
   *
   * Note: Older versions of `xtrace` output to stderr instead of stdout.
   */
  (stdout || stderr).split("\n").reduce<Device["type"]>((type, line) => {
    if (line === "== Devices ==") {
      return "device";
    } else if (line === "== Simulators ==") {
      return "simulator";
    }

    const match = line.match(
      /(.*?)(?:\sSimulator)?\s\(([.\d]+)\)(?:\s\+\s(.*?)\s\(([.\d]+)\))?\s\(([0-9A-Fa-f]{8}-[0-9A-Fa-f]{16}|[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})\)/
    );
    if (match) {
      const [, name, osVersion, accessoryName, accessoryVersion, udid] = match;
      devices.push({
        name,
        type,
        osVersion,
        ...(accessoryName
          ? {
              accessories: [
                {
                  name: accessoryName,
                  type,
                  osVersion: accessoryVersion,
                  udid,
                },
              ],
            }
          : undefined),
        udid,
      });
    }
    return type;
  }, "unknown");

  return devices;
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
  const { type, udid } = device;
  const install =
    type === "device"
      ? () => iosDeploy("--id", udid, "--bundle", app)
      : () => xcrun("simctl", "install", udid, app);

  const { stderr, status } = await install();
  return status === 0 ? null : new Error(stderr);
}

async function launch(device: Device, app: string): Promise<Error | null> {
  const { type, udid } = device;
  if (type === "device") {
    const launch = iosDeploy(
      "--id",
      udid,
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

    const launch = xcrun("simctl", "launch", udid, CFBundleIdentifier);
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
      ? ({ name, type }) => name === deviceName && type === "device"
      : (device) => device.type === "device";
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

    const { name, osVersion } = physicalDevice;
    spinner.info(`Found ${name} (${osVersion})`);
    return physicalDevice;
  }

  const device = deviceName
    ? devices.find(
        ({ name, type, accessories }) =>
          name === deviceName && type === "simulator" && !accessories
      )
    : devices
        .reverse()
        .find(
          ({ name, type, accessories }) =>
            type === "simulator" && !accessories && /^iPhone \d\d$/.test(name)
        );
  if (!device) {
    const message = deviceName
      ? `Failed to find simulator: ${deviceName}`
      : "Failed to find an iPhone simulator";
    spinner.fail(message);
    return null;
  }

  const availableSimulators = await getAvailableSimulators(device.udid);
  for (const simulators of Object.values(availableSimulators)) {
    for (const simulator of simulators) {
      const { name, state, udid } = simulator;
      if (udid === device.udid) {
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

  throw new Error(`Failed to find simulator: ${device.udid}`);
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

  if (device.type === "device") {
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
