import { open } from "@rnx-kit/tools-apple/macos";
import * as os from "node:os";
import type { Ora } from "ora";
import { untar } from "../archive.js";
import type { BuildParams } from "../types.js";

export async function deploy(
  archive: string,
  _: BuildParams,
  spinner: Ora
): Promise<void> {
  if (os.platform() !== "darwin") {
    return;
  }

  spinner.start(`Extracting ${archive}`);
  const app = await untar(archive);

  spinner.text = `Launching ${app}`;
  await open(app);

  spinner.succeed(`Launched ${app}`);
}
