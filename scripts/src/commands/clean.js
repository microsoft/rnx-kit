// @ts-check

import { Command, Option } from "clipanion";
import * as fs from "node:fs";

export class CleanCommand extends Command {
  /**
   * @override
   */
  static paths = [["clean"]];
  /**
   * @override
   */
  static usage = Command.Usage({
    description: "Cleans the current package",
    details: `
      This command removes all build artifacts from the current package.
    `,
    examples: [[`Clean the current package`, `$0 clean`]],
  });

  force = Option.Boolean(`--force`, true, {
    description: "Force the clean",
  });

  recursive = Option.Boolean(`--recursive`, true, {
    description: "Recursively clean",
  });

  maxRetries = Option.String(`--max-retries`, {
    description: "Maximum number of retries",
  });

  async execute() {
    const maxRetries = this.maxRetries ? parseInt(this.maxRetries, 10) : 3;
    const options = {
      force: this.force,
      maxRetries,
      recursive: this.recursive,
    };
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
