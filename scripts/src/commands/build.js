// @ts-check

import * as fs from "node:fs";
import { runScript } from "../process.js";

/** @type {import("../process.js").Command} */
export async function build(_args, rawArgs = []) {
  // If `--dependencies` is specified, also build the package's dependencies.
  if (rawArgs.includes("--dependencies")) {
    const manifest = fs.readFileSync("package.json", { encoding: "utf-8" });
    const { name } = JSON.parse(manifest);
    return runScript("nx", "build", name);
  }

  await runScript("tsc", "--outDir", "lib", ...rawArgs);
}
