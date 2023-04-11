"use strict";

const metroTypesVersion = "^0.76.0";

const dependencies = {
  jest: "^29.0.0",
  metro: metroTypesVersion,
  "metro-babel-transformer": metroTypesVersion,
  "metro-config": metroTypesVersion,
  "metro-core": metroTypesVersion,
  "metro-resolver": metroTypesVersion,
  "metro-source-map": metroTypesVersion,
  "metro-transform-worker": metroTypesVersion,
  node: "^16.0.0",
  yargs: "^16.0.0",
};

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
    version: "^0.17.0",
  },
  eslint: {
    name: "eslint",
    version: "^8.0.0",
  },
  "find-up": {
    name: "find-up",
    version: "^5.0.0",
  },
  jest: {
    name: "jest",
    version: dependencies.jest,
  },
  "jest-cli": {
    name: "jest-cli",
    version: "^29.2.1",
  },
  "pkg-dir": {
    name: "pkg-dir",
    version: "^5.0.0",
  },
  prettier: {
    name: "prettier",
    version: "^2.8.0",
  },
  semver: {
    name: "semver",
    version: "^7.0.0",
  },
  typescript: {
    name: "typescript",
    version: "^5.0.0",
  },
  yargs: {
    name: "yargs",
    version: dependencies.yargs,
  },
};

const { presets } = require("@rnx-kit/align-deps");
const profileNames = Object.keys(presets["microsoft/react-native"]);

module.exports = profileNames.reduce((preset, key) => {
  preset[key] = profile;
  return preset;
}, {});
