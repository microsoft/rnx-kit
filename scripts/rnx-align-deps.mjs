#!/usr/bin/env node
import * as path from "node:path";
import { fileURLToPath } from "node:url";
// Import the bundle directly to avoid circular dependency
import { cli } from "../packages/align-deps/lib/index.js";

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
