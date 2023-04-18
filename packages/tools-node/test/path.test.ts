import { normalizePath } from "../src/path";

describe("Node > Path", () => {
  test("normalizePath() changes all backslashes to forward slashes", () => {
    expect(normalizePath(String.raw`\\hello\test`)).toEqual("//hello/test");
  });

  test("normalizePath() changes nothing when the input string has no backslashes", () => {
    expect(normalizePath("hello/test")).toEqual("hello/test");
  });
});
