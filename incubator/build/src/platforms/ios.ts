import * as path from "node:path";
import type { Ora } from "ora";
import { untar } from "../archive";
import { retry } from "../async";
import { ensure, makeCommand, makeCommandSync } from "../command";
import { open } from "./macos";

type SimDevice = {
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

type Devices = {
  devices: Record<string, SimDevice[]>;
};

const xcrun = makeCommand("xcrun");

async function bootSimulator({ udid }: SimDevice): Promise<Error | null> {
  const { stderr, status } = await xcrun("simctl", "boot", udid);
  if (status !== 0) {
    return new Error(stderr);
  }

  const result = await retry(async () => {
    const dev = await getDevice(udid);
    return dev?.state === "Booted" || null;
  }, 4);
  return result ? null : new Error("Timed out waiting for the simulator");
}

async function getAvailableDevices(
  search = "iPhone"
): Promise<Record<string, SimDevice[]>> {
  const result = ensure(
    await xcrun("simctl", "list", "--json", "devices", search, "available")
  );
  const { devices } = JSON.parse(result) as Devices;
  return devices;
}

function getDeveloperDirectory(): string | undefined {
  const xcodeSelect = makeCommandSync("xcode-select");
  const { stdout, status } = xcodeSelect("--print-path");
  return status === 0 ? stdout.trim() : undefined;
}

async function getDevice(
  deviceName: string | undefined
): Promise<SimDevice | null> {
  const devices = await getAvailableDevices(deviceName);
  const runtime = Object.keys(devices)
    .sort()
    .reverse()
    .find((runtime) => devices[runtime].length !== 0);
  if (!runtime) {
    return null;
  }

  const deviceList = devices[runtime];
  return deviceList[deviceList.length - 1];
}

async function install(
  app: string,
  { udid }: SimDevice
): Promise<Error | null> {
  const { stderr, status } = await xcrun("simctl", "install", udid, app);
  return status === 0 ? null : new Error(stderr);
}

async function launch(app: string, { udid }: SimDevice): Promise<void> {
  const plutil = makeCommand("plutil");
  const plistResult = await plutil(
    "-convert",
    "json",
    "-o",
    "-",
    path.join(app, "Info.plist")
  );
  const plist = ensure(plistResult, `Failed to parse 'Info.plist' of '${app}'`);
  const { CFBundleIdentifier } = JSON.parse(plist);
  ensure(await xcrun("simctl", "launch", udid, CFBundleIdentifier));
}

export async function installAndLaunchApp(
  archive: string,
  deviceName: string | undefined,
  spinner: Ora
): Promise<void> {
  const developerDir = getDeveloperDirectory();
  if (!developerDir) {
    spinner.warn("Xcode is required to install and launch apps");
    return;
  }

  const device = await getDevice(deviceName);
  if (!device) {
    spinner.fail("Failed to find an appropriate simulator");
    return;
  }

  if (device.state === "Booted") {
    spinner.info(`${device.name} simulator is already connected`);
  } else {
    spinner.start(`Booting ${device.name} simulator`);
    const error = await bootSimulator(device);
    if (error) {
      spinner.fail(error.message);
      return;
    }
    spinner.succeed(`Booted ${device.name} simulator`);
  }

  await open(path.join(developerDir, "Applications", "Simulator.app"));

  spinner.start(`Extracting ${archive}`);
  const app = await untar(archive);

  spinner.text = `Installing ${app}`;
  const error = await install(app, device);
  if (error) {
    spinner.fail(error.message);
    return;
  }

  spinner.text = `Launching ${app}`;
  await launch(app, device);

  spinner.succeed(`Launched ${app}`);
}
