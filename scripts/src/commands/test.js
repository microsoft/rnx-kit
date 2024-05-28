// @ts-check
import * as fs from "node:fs/promises";
import { execute, runScript } from "../process.js";

/** @type {import("../process.js").Command} */
export async function test(_args, rawArgs = []) {
  const manifest = await fs.readFile(process.cwd() + "/package.json", {
    encoding: "utf-8",
  });
  if (manifest.includes('"jest"')) {
    await runScript("jest", "--passWithNoTests", ...rawArgs);
  } else {
    const tests =
      rawArgs.length > 0
        ? rawArgs
        : await import("fast-glob").then(({ default: fg }) =>
            fg.async("test/**/*.test.ts", { followSymbolicLinks: false })
          );
    await execute(
      process.argv0,
      "--import",
      import.meta.resolve("tsx"),
      "--test",
      ...tests
    );
  }
}
