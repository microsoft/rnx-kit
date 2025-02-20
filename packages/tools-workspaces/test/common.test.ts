import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { findPackages, findPackagesSync } from "../src/implementations/common";

describe("findPackages", () => {
  it("returns an empty array when passed no patterns", async () => {
    deepEqual(await findPackages(undefined, "/"), []);
  });

  it("returns an empty array when passed no patterns (sync)", () => {
    deepEqual(findPackagesSync(undefined, "/"), []);
  });
});
