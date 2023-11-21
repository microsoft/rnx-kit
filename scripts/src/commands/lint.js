// @ts-check

import { runScript } from "../process.js";

/** @type {import("../process.js").Command} */
export async function lint(_args, rawArgs = []) {
  const extensions = ["cjs", "js", "jsx", "mjs", "ts", "tsx"].join(",");
  await runScript("eslint", `src/**/*.{${extensions}}`, ...rawArgs);
}
