import * as path from "node:path";
import type { Ora } from "ora";
import { idle } from "../async";
import { ensure, makeCommand, makeCommandSync } from "../command";

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

const open = makeCommand("open");
const xcrun = makeCommand("xcrun");

async function bootSimulator({ udid }: SimDevice): Promise<void> {
  ensure(await xcrun("simctl", "boot", udid));

  while (udid) {
    await idle(1000);
    const dev = await getDevice(udid);
    if (dev.state === "Booted") {
      break;
    }
  }
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

async function getDevice(deviceName: string | undefined): Promise<SimDevice> {
  const devices = await getAvailableDevices(deviceName);
  const runtime = Object.keys(devices)
    .sort()
    .reverse()
    .find((runtime) => devices[runtime].length !== 0);
  if (!runtime) {
    throw new Error("Could not find an appropriate simulator");
  }

  const deviceList = devices[runtime];
  return deviceList[deviceList.length - 1];
}

async function install(app: string, { udid }: SimDevice): Promise<void> {
  ensure(await xcrun("simctl", "install", udid, app));
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

async function untar(archive: string): Promise<string> {
  const buildDir = path.dirname(archive);
  const tar = makeCommand("tar", { cwd: buildDir });

  const filename = path.basename(archive);
  const list = ensure(await tar("tf", filename));
  const m = list.match(/(.*?)\//);
  if (!m) {
    throw new Error(`Failed to determine content of ${archive}`);
  }

  ensure(await tar("xf", filename));
  return path.join(buildDir, m[1]);
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
  if (device.state === "Booted") {
    spinner.info(`${device.name} simulator is already connected`);
  } else {
    spinner.start(`Booting ${device.name} simulator`);
    await bootSimulator(device);
    spinner.succeed(`Booted ${device.name} simulator`);
  }

  await open(path.join(developerDir, "Applications", "Simulator.app"));

  const app = await untar(archive);

  spinner.start(`Installing ${app}`);
  await install(app, device);
  spinner.succeed(`Installed ${app}`);

  spinner.start(`Launching ${app}`);
  await launch(app, device);
  spinner.succeed(`Launched ${app}`);
}
