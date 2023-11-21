// @ts-check

import { URL } from "node:url";
import { execute } from "../process.js";

/** @type {import("../process.js").Command} */
export async function buildIOS(_args, rawArgs) {
  const buildScript = new URL("build-ios.sh", import.meta.url);
  await execute(buildScript.pathname, ...(rawArgs ?? []));
}
