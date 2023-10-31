// @ts-check

import * as fs from "node:fs";
import { runScript, sequence } from "../process.mjs";
import { clean } from "./clean.mjs";
import { depcheck } from "./depcheck.mjs";
import { lint } from "./lint.mjs";

/** @type {import("../process.mjs").Command} */
export async function build(_args, rawArgs = []) {
  // If `--dependencies` is specified, also build the package's dependencies.
  if (rawArgs.includes("--dependencies")) {
    const manifest = fs.readFileSync("package.json", { encoding: "utf-8" });
    const { name } = JSON.parse(manifest);
    return runScript("nx", "build", name);
  }

  await sequence(clean, depcheck, lint, () =>
    runScript("tsc", "--outDir", "lib", ...rawArgs)
  );
}
