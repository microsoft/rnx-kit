// @ts-check

import { Command } from "clipanion";
import { fileURLToPath } from "node:url";

export class FormatCommand extends Command {
  /** @override */
  static paths = [["format"]];

  /** @override */
  static usage = Command.Usage({
    description: "Formats the current package",
    details: "This command formats the current package using oxfmt.",
    examples: [["Format the current package", "$0 format"]],
  });

  async execute() {
    const oxfmt = import.meta.resolve("oxfmt/bin/oxfmt");
    process.argv = [
      process.argv0,
      fileURLToPath(oxfmt),
      "**/*.{js,json,jsx,md,mjs,mts,ts,tsx,yml}",
      "!{CODE_OF_CONDUCT,SECURITY}.md",
      "!**/{__fixtures__,lib}/**",
      "!**/CHANGELOG.*",
    ];
    await import(oxfmt);
    return 0;
  }
}
