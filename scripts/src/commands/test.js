// @ts-check
import { Command, Option } from "clipanion";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { execute, runScript } from "../process.js";

/**
 * @param {string} cwd
 * @returns {Promise<Record<string, unknown>>}
 */
async function importManifest(cwd) {
  const url = pathToFileURL(path.join(cwd, "package.json"));
  const manifest = await import(url.href, { with: { type: "json" } });
  return manifest.default ?? manifest;
}

/**
 * @param {Record<string, unknown>} manifest
 * @param {string} cwd
 * @returns {boolean}
 */
function useJest(manifest, cwd) {
  return Boolean(manifest.jest) || fs.existsSync(cwd + "/jest.config.js");
}

/**
 * @param {Record<string, unknown>} manifest
 * @returns {boolean}
 */
function useTsx(manifest) {
  return manifest.type === "commonjs";
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
    const manifest = await importManifest(cwd);

    if (useJest(manifest, cwd)) {
      return await runScript("jest", "--passWithNoTests", ...this.args);
    }

    const coverage = this.args.indexOf("--coverage");
    if (coverage >= 0) {
      // TODO: Code coverage is still experimental as of Node v25.9.0
      // https://nodejs.org/api/cli.html#experimental-test-coverage
      this.args[coverage] = "--experimental-test-coverage";
    }

    const tests =
      this.args.length > 0 ? this.args : fs.globSync("test/**/*.test.ts");
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
