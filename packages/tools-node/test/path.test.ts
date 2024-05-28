import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizePath } from "../src/path";

describe("Node > Path", () => {
  it("normalizePath() changes all backslashes to forward slashes", () => {
    equal(normalizePath(String.raw`\\hello\test`), "//hello/test");
  });

  it("normalizePath() changes nothing when the input string has no backslashes", () => {
    equal(normalizePath("hello/test"), "hello/test");
  });
});
