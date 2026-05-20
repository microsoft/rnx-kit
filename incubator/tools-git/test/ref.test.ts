import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyRef } from "../src/ref.ts";

describe("verifyRef()", () => {
  it("handles invalid reference names", () => {
    ok(!verifyRef(""));
    ok(!verifyRef("."));
    ok(!verifyRef("/"));
    ok(!verifyRef("main/"));
    ok(!verifyRef("origin main"));
    ok(!verifyRef("origin..main"));
    ok(!verifyRef("origin:main"));
    ok(!verifyRef("origin^main"));
    ok(!verifyRef("origin~main"));
  });

  it("handles valid reference names", () => {
    ok(verifyRef("main"));
    ok(verifyRef("origin/main"));
    ok(verifyRef("user/feat/change"));
  });
});
