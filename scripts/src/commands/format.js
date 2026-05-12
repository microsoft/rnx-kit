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
    const url = new URL("../bin/oxfmt", import.meta.resolve("oxfmt"));
    const oxfmt = fileURLToPath(url);
    process.argv = [
      process.argv0,
      oxfmt,
      "*.{cjs,js,json,jsx,md,mjs,mts,ts,tsx,yml}",
      "!{#archived,__fixtures__,lib}",
      "!{CHANGELOG,CODE_OF_CONDUCT,SECURITY}.md",
    ];
    await import(oxfmt);
    return 0;
  }
}
