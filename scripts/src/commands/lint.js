// @ts-check

import { spawnSync } from "node:child_process";
import { runScript } from "../process.js";

/**
 * @param {...string} patterns
 * @returns {string[]}
 */
function listFiles(...patterns) {
  const args = ["ls-files", ...patterns];
  const { stdout } = spawnSync("git", args, { encoding: "utf-8" });
  return stdout.trim().split("\n");
}

/** @type {import("../process.js").Command} */
export async function lint(_args, rawArgs = ["--no-warn-ignored"]) {
  const files = listFiles("*.cjs", "*.js", "*.jsx", "*.mjs", "*.ts", "*.tsx");
  await runScript("eslint", ...files, ...rawArgs);
}
