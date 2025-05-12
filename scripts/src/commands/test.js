// @ts-check
import { Command, Option } from "clipanion";
import * as fs from "node:fs";
import { execute, runScript } from "../process.js";

function useJest(cwd = process.cwd()) {
  const options = /** @type {const} */ ({ encoding: "utf-8" });
  const manifest = fs.readFileSync(cwd + "/package.json", options);
  return manifest.includes('"jest"') || fs.existsSync(cwd + "/jest.config.js");
}

export class TestCommand extends Command {
  /** @override */
  static paths = [["test"]];

  /** @override */
  static usage = Command.Usage({
    description: "Tests the current package",
    details: "This command tests the current package.",
    examples: [["Test the current package", "$0 test"]],
  });

  args = Option.Rest();

  async execute() {
    if (useJest()) {
      return await runScript("jest", "--passWithNoTests", ...this.args);
    }

    const tests =
      this.args.length > 0
        ? this.args
        : await import("fast-glob").then(({ default: fg }) =>
            fg.async("test/**/*.test.ts", { followSymbolicLinks: false })
          );
    return await execute(
      process.argv0,
      "--import",
      import.meta.resolve("tsx"),
      "--test",
      ...tests
    );
  }
}
