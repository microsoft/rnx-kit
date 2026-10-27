#!/usr/bin/env node

// @ts-ignore Directly import align-deps to avoid circular dependency
import { cli } from "../packages/align-deps/lib/index.js";

cli({
  "check-overrides": true,
  "no-unmanaged": true,
  requirements: ["react-native@0.85"],
  write: process.argv.includes("--write"),
});
