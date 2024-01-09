#!/usr/bin/env node
import { URL } from "node:url";
// Import the bundle directly to avoid circular dependency
import { cli } from "../packages/align-deps/lib/index.js";

cli({
  presets: [
    "microsoft/react-native",
    new URL("align-deps-preset.cjs", import.meta.url).pathname,
  ],
  requirements: ["react-native@0.73"],
  write: process.argv.includes("--write"),
  "exclude-packages": ["@rnx-kit/build", "@rnx-kit/metro-plugin-typescript"],
});
