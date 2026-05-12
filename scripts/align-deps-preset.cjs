"use strict";

const dependencies = {
  jest: "^29.2.1",
  node: "^24.0.0",
  yargs: "^16.0.0",
};

/**
 * Returns available profiles.
 *
 * Note: We get available profiles from disk instead of importing
 * `@rnx-kit/align-deps` to avoid circular dependency.
 *
 * @returns {string[]}
 */
function getAvailableProfiles() {
  const profiles = [];

  const fs = require("node:fs");
  const path = require("node:path");

  const prefix = "profile-";
  const presetDir = path.resolve(
    __dirname,
    "..",
    "packages",
    "align-deps",
    "src",
    "presets",
    "microsoft",
    "react-native"
  );
  const files = fs.readdirSync(presetDir);
  for (const filename of files) {
    if (!filename.startsWith(prefix)) {
      continue;
    }

    const version = path.basename(filename, ".ts").substring(prefix.length);
    profiles.push(version);
  }

  return profiles;
}

function makeTypesEntries() {
  /** @type {Record<string, { name: string; version: string; devOnly: true; }>} */
  const types = {};
  for (const [name, version] of Object.entries(dependencies)) {
    const pkgName = `@types/${name}`;
    types[pkgName] = { name: pkgName, version, devOnly: true };
  }
  return types;
}

function makePreset() {
  const profile = {
    ...makeTypesEntries(),
    "@react-native-community/cli-types": {
      name: "@react-native-community/cli-types",
      version: "^20.1.0",
      devOnly: true,
    },
    esbuild: {
      name: "esbuild",
      version: "^0.28.0",
      devOnly: true,
    },
    "find-up": {
      name: "find-up",
      version: "^5.0.0",
    },
    "oxc-resolver": {
      name: "oxc-resolver",
      version: "^11.0.0",
      devOnly: true,
    },
    "metro-babel-transformer": {
      name: "metro-babel-transformer",
      version: "^0.84.0",
      devOnly: true,
    },
    "metro-source-map": {
      name: "metro-source-map",
      version: "^0.84.0",
      devOnly: true,
    },
    "metro-transform-worker": {
      name: "metro-transform-worker",
      version: "^0.84.0",
      devOnly: true,
    },
    semver: {
      name: "semver",
      version: "^7.0.0",
    },
    yargs: {
      name: "yargs",
      version: dependencies.yargs,
    },
  };

  /** @type {Record<string, typeof profile>} */
  const preset = {};
  for (const key of getAvailableProfiles()) {
    preset[key] = profile;
  }

  return preset;
}

module.exports = makePreset();
