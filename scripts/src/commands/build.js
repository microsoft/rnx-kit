// @ts-check

const fs = require("fs/promises");
const { runScript, sequence } = require("../process");
const clean = require("./clean");
const depcheck = require("./depcheck");
const lint = require("./lint");

/** @type {import("../process").Command} */
module.exports = async (_args, rawArgs = []) => {
  // If `--dependencies` is specified, also build the package's dependencies.
  if (rawArgs.includes("--dependencies")) {
    const manifest = await fs.readFile("package.json", { encoding: "utf-8" });
    const { name } = JSON.parse(manifest);
    return runScript("nx", "build", name.substring("@rnx-kit/".length));
  }

  return sequence(clean, depcheck, lint, () =>
    runScript("tsc", "--outDir", "lib", ...rawArgs)
  );
};
