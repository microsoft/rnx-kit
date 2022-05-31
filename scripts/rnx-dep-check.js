#!/usr/bin/env node

"use strict";

module.exports = {
  "@rnx-kit/tools-node": {
    name: "@rnx-kit/tools-node",
    version: "^1.2.7",
    devOnly: true,
  },
  "@types/jest": {
    name: "@types/jest",
    version: "^27.0.0",
    devOnly: true,
  },
  "@types/node": {
    name: "@types/node",
    version: "^16.0.0",
    devOnly: true,
  },
  "@types/react-native": {
    name: "@types/react-native",
    version: "^0.66.0",
    devOnly: true,
  },
  "@types/yargs": {
    name: "@types/node",
    version: "^16.0.0",
    devOnly: true,
  },
  chalk: {
    name: "chalk",
    version: "^4.1.0",
  },
  esbuild: {
    name: "esbuild",
    version: "^0.14.10",
  },
  "find-up": {
    name: "find-up",
    version: "^5.0.0",
  },
  jest: {
    name: "jest",
    version: "^27.0.0",
  },
  "jest-diff": {
    name: "jest-diff",
    version: "^26.0.0",
  },
  "jest-extended": {
    name: "jest-extended",
    version: "^2.0.0",
    devOnly: true,
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
    version: "^0.18.3",
  },
  yargs: {
    name: "yargs",
    version: "^16.0.0",
  },
};

if (require.main === module) {
  require("@rnx-kit/dep-check").cli({
    "custom-profiles": __filename,
    vigilant: "0.66",
    write: process.argv.includes("--write"),
  });
}
