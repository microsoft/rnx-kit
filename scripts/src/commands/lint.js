// @ts-check

import { Command, Option } from "clipanion";
import * as fs from "node:fs";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";

export class LintCommand extends Command {
  /** @override */
  static paths = [["lint"]];

  /** @override */
  static usage = Command.Usage({
    description: "Lints the current package",
    details: "This command lints the current package using oxlint.",
    examples: [["Lint the current package", "$0 lint"]],
  });

  args = Option.Proxy();

  async execute() {
    // oxlint currently only exports "." so we need to make some assumptions
    // about where to find `cli.js`
    const oxlint = new URL("./cli.js", import.meta.resolve("oxlint"));

    const args = [
      process.argv0,
      fileURLToPath(oxlint),
      "-c",
      this.configPath,
      "--ignore-pattern=__fixtures__",
    ];
    if (process.platform === "win32") {
      args.push("--threads=1");
    }
    args.push(...this.args);

    process.argv = args;
    await import(oxlint.href);

    if (process.exitCode == null) {
      return 0;
    }

    return typeof process.exitCode === "number" ? process.exitCode : -1;
  }

  get configPath() {
    const localConfig = path.join(process.cwd(), "oxlint.config.ts");
    if (fs.existsSync(localConfig)) {
      return localConfig;
    }

    return fileURLToPath(
      import.meta.resolve("../../../packages/oxlint-config/private.ts")
    );
  }
}
