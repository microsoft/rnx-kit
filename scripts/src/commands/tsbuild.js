// @ts-check
import { runWithCmdlineArgs } from "../../../incubator/tools-typescript/lib/bin/ts-tool.js";

/** @type {import("../process.js").Command} */
export async function tsbuild(_args, rawArgs = []) {
  await runWithCmdlineArgs(rawArgs);
}
