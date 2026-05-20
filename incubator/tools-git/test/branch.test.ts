import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { getDefaultBranch } from "../src/branch.ts";

describe("getDefaultBranch()", () => {
  it("returns default branch", () => {
    equal(getDefaultBranch(), "origin/main");
  });

  it("returns fallback branch", () => {
    equal(getDefaultBranch("origin/trunk", "1"), "origin/trunk");
  });
});
