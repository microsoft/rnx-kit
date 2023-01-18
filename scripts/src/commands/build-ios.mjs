// @ts-check

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { execute } from "../process.mjs";

/** @type {import("../process.mjs").Command} */
export default async function buildIOS(_args, rawArgs) {
  const buildScript = path.join(
    // @ts-expect-error ts(1343): 'import.meta' is only allowed when module is ESM
    path.dirname(fileURLToPath(import.meta.url)),
    "build-ios.sh"
  );
  await execute(buildScript, ...(rawArgs ?? []));
}
