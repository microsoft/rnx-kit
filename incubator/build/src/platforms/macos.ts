import * as os from "node:os";
import type { Ora } from "ora";
import { untar } from "../archive";
import { makeCommand } from "../command";

export const open = makeCommand("open");

export async function launch(archive: string, spinner: Ora): Promise<void> {
  if (os.platform() !== "darwin") {
    return;
  }

  spinner.start(`Extracting ${archive}`);
  const app = await untar(archive);

  spinner.text = `Launching ${app}`;
  await open(app);
  spinner.succeed(`Launched ${app}`);
}
