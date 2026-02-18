// @ts-check

import { Command, Option } from "clipanion";
import * as fs from "node:fs";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { execute, runScript, workspaceRoot } from "../process.js";

export class BuildCommand extends Command {
  /** @override */
  static paths = [["build"]];

  /** @override */
  static usage = Command.Usage({
    description: "Builds the current package",
    details:
      "If `--dependencies` is specified, also build the package's dependencies.",
    examples: [["Build the current package", "$0 build"]],
  });

  dependencies = Option.Boolean("--dependencies", false, {
    description: "Also build the package's dependencies",
  });

  withTsc = Option.Boolean("--with-tsc", false, {
    description: "Use `tsc` instead of `tsgo` to build the package",
  });

  args = Option.Rest();

  async execute() {
    if (this.dependencies) {
      const manifest = fs.readFileSync("package.json", { encoding: "utf-8" });
      const { name } = JSON.parse(manifest);
      return await runScript("nx", "build", name);
    }

    if (this.withTsc) {
      return await runScript("tsc", "--outDir", "lib", ...this.args);
    }

    const tsc = await this.getNativeBinaryPath();
    return await execute(tsc, "--outDir", "lib", ...this.args);
  }

  async getNativeBinaryPath() {
    const cachePath = path.join(
      workspaceRoot(),
      "node_modules",
      ".cache",
      "tsgo"
    );

    if (fs.existsSync(cachePath)) {
      const tsgo = fs.readFileSync(cachePath, { encoding: "utf-8" });
      if (fs.existsSync(tsgo)) {
        return tsgo;
      }
    }

    // If we haven't cached the location of `tsgo` yet, we can find it by
    // calling `getExePath` from `@typescript/native-preview`. This is what
    // `tsgo.js` does internally, but it does not cache the location and does
    // this lookup every time it is executed.

    const manifestPath = import.meta
      .resolve("@typescript/native-preview/package.json");
    const manifest = JSON.parse(
      fs.readFileSync(fileURLToPath(manifestPath), { encoding: "utf-8" })
    );

    // On Windows, absolute paths must be valid file:// URLs
    const getExePathPath = new URL(
      manifest.imports["#getExePath"],
      manifestPath
    );
    const getExePath = await import(getExePathPath.href);
    const tsgo = getExePath.default();

    // Save the location of the native binary so that we don't have to do the
    // lookup again next time.
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFile(cachePath, tsgo, { encoding: "utf-8" }, () => undefined);

    return tsgo;
  }
}
