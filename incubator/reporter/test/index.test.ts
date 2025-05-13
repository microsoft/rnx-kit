// this file has a method that tests the FakeMethod from ../src/index.ts

import { fakeMethod } from "../src/index";

describe("FakeMethod", () => {
  it("should return a string", () => {
    expect(fakeMethod("Hello World!")).toBe("Hello World!");
  });
});
