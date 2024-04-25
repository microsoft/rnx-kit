import {
  install,
  iosDeploy,
  launch,
  selectDevice,
} from "@rnx-kit/tools-apple/ios";
import { open } from "@rnx-kit/tools-apple/macos";
import { getDeveloperDirectory } from "@rnx-kit/tools-apple/xcode";
import { ensureInstalled } from "@rnx-kit/tools-shell/command";
import * as os from "node:os";
import * as path from "node:path";
import type { Ora } from "ora";
import { untar } from "../archive.js";
import type { BuildParams } from "../types.js";

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
