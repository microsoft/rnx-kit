"use strict";

const dependencies = {
  jest: "^29.2.1",
  node: "^20.0.0",
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
  return Object.entries(dependencies).reduce((types, [name, version]) => {
    const pkgName = `@types/${name}`;
    types[pkgName] = { name: pkgName, version, devOnly: true };
    return types;
  }, {});
}

const profile = {
  ...makeTypesEntries(),
  chalk: {
    name: "chalk",
    version: "^4.1.0",
  },
  esbuild: {
    name: "esbuild",
    version: "^0.20.0",
    devOnly: true,
  },
  eslint: {
    name: "eslint",
    version: "^8.23.0",
    devOnly: true,
  },
  "find-up": {
    name: "find-up",
    version: "^5.0.0",
  },
  "jest-cli": {
    name: "jest-cli",
    version: dependencies.jest,
  },
  "pkg-dir": {
    name: "pkg-dir",
    version: "^5.0.0",
  },
  prettier: {
    name: "prettier",
    version: "^3.0.0",
    devOnly: true,
  },
  semver: {
    name: "semver",
    version: "^7.0.0",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^3.0.0",
    devOnly: true,
  },
  typescript: {
    name: "typescript",
    version: "^5.0.0",
    devOnly: true,
  },
  yargs: {
    name: "yargs",
    version: dependencies.yargs,
  },
};

module.exports = getAvailableProfiles().reduce((preset, key) => {
  preset[key] = profile;
  return preset;
}, {});
