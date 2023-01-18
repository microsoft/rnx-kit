// @ts-check

import { runScript } from "../process.mjs";

/** @type {import("../process.mjs").Command} */
export default async function lint(_args, rawArgs = []) {
  await runScript("eslint", "--config", "package.json", "src/*", ...rawArgs);
}
