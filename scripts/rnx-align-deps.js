#!/usr/bin/env node
"use strict";

const { cli } = require("@rnx-kit/align-deps");
const path = require("path");

cli({
  presets: [
    "microsoft/react-native",
    path.join(__dirname, "align-deps-preset.js"),
  ],
  "exclude-packages": "@rnx-kit/expo-app",
  requirements: ["react-native@0.68"],
  write: process.argv.includes("--write"),
});
