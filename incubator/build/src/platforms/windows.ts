import { install, start } from "@rnx-kit/tools-windows";
import * as os from "node:os";
import type { Ora } from "ora";
import type { BuildParams } from "../types.js";

export async function deploy(
  app: string,
  _: BuildParams,
  spinner: Ora
): Promise<void> {
  if (os.platform() !== "win32") {
    return;
  }

  spinner.start(`Installing ${app}`);
  const result = await install(app);
  if (result instanceof Error) {
    spinner.warn(result.message);
    spinner.fail();
    return;
  }

  spinner.text = `Launching ${result}`;
  await start(result);

  spinner.succeed(`Launched ${result}`);
}
