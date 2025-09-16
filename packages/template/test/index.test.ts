// this file has a method that tests the FakeMethod from ../src/index.ts
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { fakeMethod } from "../src/index";

describe("FakeMethod", () => {
  it("should return a string", () => {
    equal(fakeMethod("Hello World!"), "Hello World!");
  });
});
