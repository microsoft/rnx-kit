// @ts-check
import * as fs from "node:fs";

/**
 * @returns {Record<string, string>}
 */
export function getRootEnginesField() {
  const root = fs.readFileSync(new URL("../../package.json", import.meta.url));
  const manifest = JSON.parse(root.toString());
  if (typeof manifest.engines !== "object") {
    throw new Error("'engines' field is incorrectly configured");
  }

  return manifest.engines;
}
