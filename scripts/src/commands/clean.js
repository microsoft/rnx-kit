// @ts-check

import { Command } from "clipanion";
import * as fs from "node:fs";

export class CleanCommand extends Command {
  /** @override */
  static paths = [["clean"]];

  /** @override */
  static usage = Command.Usage({
    description: "Cleans the current package",
    details:
      "This command removes all build artifacts from the current package.",
    examples: [["Clean the current package", "$0 clean"]],
  });

  async execute() {
    const options = { force: true, maxRetries: 3, recursive: true };
    [
      "bin",
      "coverage",
      "dist",
      "lib",
      "lib-amd",
      "lib-commonjs",
      "lib-es2015",
      "lib-es6",
      "temp",
    ].map((dir) => fs.rmSync(dir, options));
  }
}
