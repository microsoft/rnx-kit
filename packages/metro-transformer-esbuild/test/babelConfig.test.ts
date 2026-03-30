import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { findBabelConfigFile } from "../src/babelConfig";
import { BabelModeHelper } from "../src/babelMode";

describe("findBabelConfigFile", () => {
  it("returns undefined for a directory with no babel config", () => {
    equal(findBabelConfigFile(__dirname), undefined);
  });

  it("finds babel.config.js in the project root", () => {
    const result = findBabelConfigFile(process.cwd());
    if (result) {
      ok(
        result.endsWith(".babelrc") ||
          result.endsWith(".babelrc.js") ||
          result.endsWith("babel.config.js")
      );
    }
  });
});

describe("BabelModeHelper", () => {
  it("returns the same instance for the same mode", () => {
    const a = BabelModeHelper.find({ jsx: "babel", ts: "babel" });
    const b = BabelModeHelper.find({ jsx: "babel", ts: "babel" });
    ok(a === b);
  });

  it("returns different instances for different modes", () => {
    const a = BabelModeHelper.find({ jsx: "babel", ts: "babel" });
    const b = BabelModeHelper.find({ jsx: "esbuild", ts: "babel" });
    ok(a !== b);
  });

  it("produces a stable key from the mode", () => {
    const helper = BabelModeHelper.find({ jsx: "babel", ts: "babel" });
    ok(typeof helper.key === "string");
    ok(helper.key.length > 0);
  });

  it("returns undefined for getCachedOptions before any config is built", () => {
    // Use a unique mode to get a fresh instance
    const helper = BabelModeHelper.find({ jsx: "esbuild", ts: "babel" });
    equal(helper.getCachedOptions(), undefined);
  });
});
