import * as os from "node:os";
import type { Ora } from "ora";
import { untar } from "../archive";
import { makeCommand } from "../command";
import type { BuildParams } from "../types";

export const open = makeCommand("open");

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
