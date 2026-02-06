// @ts-check
import manifest from "../../package.json" with { type: "json" };

/**
 * @returns {Record<string, string>}
 */
export function getRootEnginesField() {
  if (typeof manifest.engines !== "object") {
    throw new Error("'engines' field is incorrectly configured");
  }

  return manifest.engines;
}
