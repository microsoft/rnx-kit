// @ts-check

import { Command, Option } from "clipanion";
import { spawnSync } from "node:child_process";
import { runScript } from "../process.js";

export class LintCommand extends Command {
  /**
   * @override
   */
  static paths = [["lint"]];

  /**
   * @override
   */
  static usage = Command.Usage({
    description: "Lints the current package",
    details: `
      This command lints the current package using eslint.
    `,
    examples: [[`Lint the current package`, `$0 lint`]],
  });

  args = Option.Proxy();

  async execute() {
    const args = this.args.length > 0 ? this.args : ["--no-warn-ignored"];
    await lint(undefined, args);
  }
}

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
  await runScript("eslint", "--no-warn-ignored", ...files, ...rawArgs);
}
