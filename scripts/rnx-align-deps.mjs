#!/usr/bin/env node
import { cli } from "@rnx-kit/align-deps";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

cli({
  presets: [
    "microsoft/react-native",
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "align-deps-preset.js"
    ),
  ],
  requirements: ["react-native@0.72"],
  write: process.argv.includes("--write"),
  "exclude-packages": ["@rnx-kit/build", "@rnx-kit/metro-plugin-typescript"],
});
