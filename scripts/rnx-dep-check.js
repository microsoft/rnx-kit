#!/usr/bin/env node

"use strict";

const common = {
  "@types/node": {
    name: "@types/node",
    version: "^14.15.0",
  },
  chalk: {
    name: "chalk",
    version: "^4.1.0",
  },
  "find-up": {
    name: "find-up",
    version: "^5.0.0",
  },
  "jest-diff": {
    name: "jest-diff",
    version: "^26.0.0",
  },
  "pkg-dir": {
    name: "pkg-dir",
    version: "^5.0.0",
  },
  semver: {
    name: "semver",
    version: "^7.0.0",
  },
  typescript: {
    name: "typescript",
    version: "^4.0.0",
  },
  "workspace-tools": {
    name: "workspace-tools",
    version: "^0.16.2",
  },
  yargs: {
    name: "yargs",
    version: "^16.0.0",
  },
};

module.exports = {
  0.63: common,
  0.64: common,
  0.65: common,
};

if (require.main === module) {
  require("@rnx-kit/dep-check").cli({
    "custom-profiles": __filename,
    "exclude-packages": "@rnx-kit/jest-resolver", // jest-resolver supports multiple versions of react-native
    vigilant: "0.64",
    write: process.argv.includes("--write"),
  });
}
