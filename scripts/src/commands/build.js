// @ts-check

import { Command, Option } from "clipanion";
import * as fs from "node:fs";
import { runScript } from "../process.js";

export class BuildCommand extends Command {
  /**
   * @override
   */
  static paths = [["build"]];

  /**
   * @override
   */
  static usage = Command.Usage({
    description: "Builds the current package",
    details: `
      If \`--dependencies\` is specified, also build the package's dependencies.
    `,
    examples: [[`Build the current package`, `yarn build`]],
  });

  dependencies = Option.Boolean(`--dependencies`, false, {
    description: "Also build the package's dependencies",
  });

  args = Option.Rest();

  async execute() {
    if (this.dependencies) {
      const manifest = fs.readFileSync("package.json", { encoding: "utf-8" });
      const { name } = JSON.parse(manifest);
      return runScript("nx", "build", name);
    }

    await runScript("tsc", "--outDir", "lib", ...this.args);
  }
}
