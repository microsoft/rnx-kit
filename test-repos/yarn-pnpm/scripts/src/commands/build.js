// @ts-check

import { runScript } from "../process.js";

/** @type {import("../process.js").Command} */
export async function build(_args, rawArgs = []) {
  await runScript("tsc", "--outDir", "lib", ...rawArgs);
}
