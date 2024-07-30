import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { latestVersion } from "../src/version";

describe("latestVersion()", () => {
  it("returns 0.0.0 if no versions are passed", () => {
    equal(latestVersion([]), "0.0.0");
  });

  it("returns latest version", () => {
    equal(latestVersion(["0.0.1", "0.0.2", "0.0.10"]), "0.0.10");
    equal(latestVersion(["0.0.10", "0.0.2", "0.0.1"]), "0.0.10");
  });
});
