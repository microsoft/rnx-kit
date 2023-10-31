// @ts-check

import { runScript } from "../process.mjs";

/** @type {import("../process.mjs").Command} */
export async function lint(_args, rawArgs = []) {
  const extensions = ["cjs", "js", "jsx", "mjs", "ts", "tsx"].join(",");
  await runScript(
    "eslint",
    "--config",
    "package.json",
    `src/**/*.{${extensions}}`,
    ...rawArgs
  );
}
