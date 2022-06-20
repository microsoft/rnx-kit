#!/usr/bin/env node
// @ts-check

/**
 * @param {Record<string, { description: string; command: import("./process").Command }>} commands
 * @returns
 */
function init(commands) {
  const yargs = require("yargs/yargs")(process.argv.slice(2));
  Object.keys(commands).forEach((name) => {
    const { description, command } = commands[name];
    yargs.command(name, description, {}, async (args) => {
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
  return yargs.help().demandCommand().argv;
}

init({
  build: {
    description: "Builds the current package",
    command: require("./commands/build"),
  },
  "build-ios": {
    description: "Builds an iOS app within the current package",
    command: require("./commands/build-ios"),
  },
  "build-android": {
    description: "Builds an Android app within the current package",
    command: require("./commands/build-android"),
  },
  bundle: {
    description: "Bundles the current package",
    command: require("./commands/bundle"),
  },
  clean: {
    description: "Removes build and test artifacts",
    command: require("./commands/clean"),
  },
  depcheck: {
    description: "Scans package for unused or missing dependencies",
    command: require("./commands/depcheck"),
  },
  format: {
    description: "Formats source files",
    command: require("./commands/format"),
  },
  go: {
    description: "Builds Go code",
    command: require("./commands/build-go"),
  },
  lint: {
    description: "Lints source files",
    command: require("./commands/lint"),
  },
  test: {
    description: "Runs tests",
    command: require("./commands/test"),
  },
  "update-api-readme": {
    description: "Updates the API tables in README.md",
    command: require("./commands/updateApiReadme"),
  },
});
