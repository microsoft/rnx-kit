#!/usr/bin/env -S yarn tsx --conditions typescript

import { URL, fileURLToPath } from "node:url";
// Directly import align-deps to avoid circular dependency
import { cli } from "../packages/align-deps/src/cli.js";

cli({
  presets: [
    "microsoft/react-native",
    fileURLToPath(new URL("align-deps-preset.cjs", import.meta.url)),
  ],
  requirements: ["react-native@0.75"],
  write: process.argv.includes("--write"),
  "exclude-packages": ["@rnx-kit/metro-plugin-typescript"],
});
