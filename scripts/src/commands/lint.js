// @ts-check

import { Command, Option } from "clipanion";
import { spawnSync } from "node:child_process";
import { runScript } from "../process.js";
import { runExperimentalCli } from "./experimental/cli.js";

/**
 * @typedef {import("clipanion").BaseContext} BaseContext
 * @typedef {BaseContext & { experimental: boolean }} ScriptContext
 */

/**
 * @class
 * @extends {Command<ScriptContext>}
 */
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
    if (this.context.experimental) {
      return await runExperimentalCli();
    }
    const args = this.args.length > 0 ? this.args : ["--no-warn-ignored"];
    const files = listFiles("*.cjs", "*.js", "*.jsx", "*.mjs", "*.ts", "*.tsx");
    return await runScript("eslint", "--no-warn-ignored", ...files, ...args);
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
