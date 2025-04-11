// @ts-check

import { Command } from "clipanion";
import { runScript } from "../process.js";

export class FormatCommand extends Command {
  /**
   * @override
   */
  static paths = [["format"]];

  /**
   * @override
   */
  static usage = Command.Usage({
    description: "Formats the current package",
    details: `
      This command formats the current package using prettier.
    `,
    examples: [[`Format the current package`, `yarn format`]],
  });

  async execute() {
    await format();
  }
}

/** @type {import("../process.js").Command} */
export async function format() {
  await runScript(
    "prettier",
    "--write",
    "--log-level",
    "error",
    "**/*.{js,json,jsx,md,mjs,ts,tsx,yml}",
    "!{CODE_OF_CONDUCT,SECURITY}.md",
    "!**/{__fixtures__,lib}/**",
    "!**/CHANGELOG.*"
  );
}
