#!/usr/bin/env node
// @ts-check

import yargs from "yargs";
import { build } from "./commands/build.js";
import { bundle } from "./commands/bundle.js";
import { clean } from "./commands/clean.js";
import { format } from "./commands/format.js";
import { lint } from "./commands/lint.js";
import { test } from "./commands/test.js";
import { updateApiReadme } from "./commands/updateApiReadme.js";

/**
 * @typedef { import("yargs").Options } Option
 * @typedef { Record<string, Option> } Options
 */

/**
 * @param {Record<string, { description: string; command: import("./process.js").Command; options?: Options }>} commands
 * @returns
 */
function init(commands) {
  const parser = yargs(process.argv.slice(2));
  for (const [name, { description, command }] of Object.entries(commands)) {
    parser.command(name, description, {}, async (args) => {
      try {
        await command(args, process.argv.slice(3));
      } catch (e) {
        if (e instanceof Error) {
          console.error(e.message);
        }
        process.exitCode = 1;
      }
    });
  }
  return parser.help().demandCommand().argv;
}

init({
  build: {
    description: "Builds the current package",
    command: build,
  },
  bundle: {
    description: "Bundles the current package",
    options: {
      minify: {
        type: "boolean",
        default: false,
      },
      platform: {
        type: "string",
        choices: ["browser", "neutral", "node", "yarn"],
        default: "node",
      },
      sourceMap: {
        type: "boolean",
        default: false,
      },
    },
    command: bundle,
  },
  clean: {
    description: "Removes build and test artifacts",
    command: clean,
  },
  format: {
    description: "Formats source files",
    command: format,
  },
  lint: {
    description: "Lints source files",
    command: lint,
  },
  test: {
    description: "Runs tests",
    command: test,
  },
  "update-api-readme": {
    description: "Updates the API tables in README.md",
    command: updateApiReadme,
  },
});
