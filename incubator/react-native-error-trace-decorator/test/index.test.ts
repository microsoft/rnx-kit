// this file has a method that tests the FakeMethod from ../src/index.ts

import FakeMethod from "../src/index";

describe("FakeMethod", () => {
  it("should return a string", () => {
    expect(FakeMethod("Hello World!")).toBe("Hello World!");
  });
});
