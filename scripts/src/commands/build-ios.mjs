// @ts-check

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { execute } from "../process.mjs";

/** @type {import("../process.mjs").Command} */
export async function buildIOS(_args, rawArgs) {
  const buildScript = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "build-ios.sh"
  );
  await execute(buildScript, ...(rawArgs ?? []));
}
