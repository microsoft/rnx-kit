// @ts-check

import { URL } from "node:url";
import { execute } from "../process.mjs";

/** @type {import("../process.mjs").Command} */
export async function buildIOS(_args, rawArgs) {
  const buildScript = new URL("build-ios.sh", import.meta.url);
  await execute(buildScript.pathname, ...(rawArgs ?? []));
}
