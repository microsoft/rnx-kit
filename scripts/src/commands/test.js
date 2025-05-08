// @ts-check
import { Command, Option } from "clipanion";
import * as fs from "node:fs";
import { execute, runScript } from "../process.js";

export class TestCommand extends Command {
  /**
   * @override
   */
  static paths = [["test"]];

  /**
   * @override
   */
  static usage = Command.Usage({
    description: "Tests the current package",
    details: `
      This command tests the current package.
    `,
    examples: [[`Test the current package`, `$0 test`]],
  });

  experimental = Option.Boolean("--experimental", false, {
    description: "Run the experimental version of the command",
  });

  args = Option.Proxy();

  async execute() {
    await test(undefined, this.args);
  }
}

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
    await execute(
      process.argv0,
      "--import",
      import.meta.resolve("tsx"),
      "--test",
      ...tests
    );
  }
}
