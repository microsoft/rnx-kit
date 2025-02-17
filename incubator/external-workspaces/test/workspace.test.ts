import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { getYarnOption } from "../src/workspace";

describe("getYarnOption", async () => {
  it("should return the correct value for an existing option", async () => {
    const result = await getYarnOption("nodeLinker");
    ok(result === "pnpm" || result === "node-modules" || result === "pnp");
  });

  it("should return undefined for a non-existing option", async () => {
    const result = await getYarnOption("nonExistingOption");
    ok(result === undefined);
  });
});
