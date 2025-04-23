// @ts-check
import * as fs from "node:fs";
import { execute, runScript } from "../process.js";

function useJest(cwd = process.cwd()) {
  const options = /** @type {const} */ ({ encoding: "utf-8" });
  const manifest = fs.readFileSync(cwd + "/package.json", options);
  return manifest.includes('"jest"') || fs.existsSync(cwd + "/jest.config.js");
}

/** @type {import("../process.js").Command} */
export async function test(_args, rawArgs = []) {
  if (useJest()) {
    await runScript("jest", "--passWithNoTests", ...rawArgs);
  } else {
    const tests =
      rawArgs.length > 0
        ? rawArgs
        : await import("fast-glob").then(({ default: fg }) =>
            fg.async("test/**/*.test.ts", { followSymbolicLinks: false })
          );
    await execute(process.argv0, "--test", ...tests);
  }
}
