#!/usr/bin/env node
// @ts-check

import yargs from "yargs";
import buildAndroid from "./commands/build-android.mjs";
import buildGo from "./commands/build-go.mjs";
import buildIOS from "./commands/build-ios.mjs";
import build from "./commands/build.mjs";
import bundle from "./commands/bundle.mjs";
import clean from "./commands/clean.mjs";
import depcheck from "./commands/depcheck.mjs";
import format from "./commands/format.mjs";
import lint from "./commands/lint.mjs";
import test from "./commands/test.mjs";
import updateApiReadme from "./commands/updateApiReadme.mjs";

/**
 * @param {Record<string, { description: string; command: import("./process.mjs").Command }>} commands
 * @returns
 */
function init(commands) {
  const parser = yargs(process.argv.slice(2));
  Object.keys(commands).forEach((name) => {
    const { description, command } = commands[name];
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
  });
  return parser.help().demandCommand().argv;
}

init({
  build: {
    description: "Builds the current package",
    command: build,
  },
  "build-ios": {
    description: "Builds an iOS app within the current package",
    command: buildIOS,
  },
  "build-android": {
    description: "Builds an Android app within the current package",
    command: buildAndroid,
  },
  bundle: {
    description: "Bundles the current package",
    command: bundle,
  },
  clean: {
    description: "Removes build and test artifacts",
    command: clean,
  },
  depcheck: {
    description: "Scans package for unused or missing dependencies",
    command: depcheck,
  },
  format: {
    description: "Formats source files",
    command: format,
  },
  go: {
    description: "Builds Go code",
    command: buildGo,
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
