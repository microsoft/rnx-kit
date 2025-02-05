// @ts-check

import { runScript } from "../process.js";

/** @type {import("../process.js").Command} */
export async function rnx(_args, rawArgs = []) {
  await runScript("rnx-cli", ...rawArgs);
}
