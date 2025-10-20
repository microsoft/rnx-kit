// @ts-check
import { Command, Option } from "clipanion";
import * as fs from "node:fs";
import { execute, runScript } from "../process.js";

/**
 * @param {string} cwd
 * @returns {string}
 */
function readManifest(cwd = process.cwd()) {
  const options = /** @type {const} */ ({ encoding: "utf-8" });
  const manifest = fs.readFileSync(cwd + "/package.json", options);
  return manifest;
}

/**
 * @param {string} manifest
 * @param {string} cwd
 * @returns {boolean}
 */
function useJest(manifest, cwd) {
  return manifest.includes('"jest"') || fs.existsSync(cwd + "/jest.config.js");
}

/**
 * @param {string} manifest
 * @returns {boolean}
 */
function useTsx(manifest) {
  // Always use `tsx` with Node versions <22 otherwise it'll throw
  // `ERR_UNKNOWN_FILE_EXTENSION` when encountering `.ts` files.
  const version = Number(process.version.slice(1).split(".")[0]);
  return version < 22 || manifest.includes('"type": "commonjs"');
}

export class TestCommand extends Command {
  /** @override */
  static paths = [["test"]];

  /** @override */
  static usage = Command.Usage({
    description: "Tests the current package",
    details: "This command tests the current package.",
    examples: [["Test the current package", "$0 test"]],
  });

  args = Option.Proxy();

  async execute() {
    const cwd = process.cwd();
    const manifest = readManifest(cwd);

    if (useJest(manifest, cwd)) {
      return await runScript("jest", "--passWithNoTests", ...this.args);
    }

    const tests =
      this.args.length > 0
        ? this.args
        : await import("fast-glob").then(({ default: fg }) =>
            fg.async("test/**/*.test.ts", { followSymbolicLinks: false })
          );
    return useTsx(manifest)
      ? await execute(
          process.argv0,
          "--import",
          import.meta.resolve("tsx"),
          "--test",
          ...tests
        )
      : await execute(process.argv0, "--test", ...tests);
  }
}
