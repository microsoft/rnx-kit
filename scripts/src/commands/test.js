// @ts-check

import { runScript } from "../process.js";

/** @type {import("../process.js").Command} */
export async function test(_args, rawArgs = []) {
  await runScript("jest", "--passWithNoTests", ...rawArgs);
}
