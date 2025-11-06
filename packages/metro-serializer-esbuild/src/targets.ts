import * as fs from "node:fs";
import { v } from "./version.ts";

export function inferBuildTarget() {
  try {
    const react = require.resolve("react-native/package.json");
    const manifest = fs.readFileSync(react, { encoding: "utf-8" });
    const { version } = JSON.parse(manifest);
    const versionNum = v(version);

    if (versionNum >= v("0.83.0")) {
      return "hermes0.14";
    } else if (versionNum >= v("0.75.0")) {
      return "hermes0.13";
    } else if (versionNum >= v("0.71.0")) {
      return "hermes0.12";
    } else if (versionNum >= v("0.68.0")) {
      return "hermes0.11";
    } else if (versionNum >= v("0.67.0")) {
      return "hermes0.10";
    } else if (versionNum >= v("0.66.0")) {
      return "hermes0.9";
    } else if (versionNum >= v("0.65.0")) {
      return "hermes0.8";
    }
  } catch (_) {
    // ignore
  }
  return "hermes0.7";
}
