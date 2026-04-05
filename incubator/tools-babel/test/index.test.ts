// this file has a method that tests the FakeMethod from ../src/index.ts
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { getFixtures } from "./testUtils";

describe("can get asts", () => {
  it("should generate fixtures", () => {
    const fixtures = getFixtures();
    equal(typeof fixtures, "object");
    let failed = 0;
    for (const file of fixtures.files) {
      const ast = fixtures.getAst(file);
      if (!ast) {
        failed++;
      }
    }
    equal(failed, 0);
  });
});
