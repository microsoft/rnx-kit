import "jest-extended";
import { escapePath, normalizePath } from "../src/path";

describe("Node > Path", () => {
  test("escapePath() changes all single-backslashes to double-backslashes", () => {
    expect(escapePath(String.raw`\hello\test`)).toEqual(
      String.raw`\\hello\\test`
    );
  });

  test("escapePath() changes all double-backslashes to quadruple-backslashes", () => {
    expect(escapePath(String.raw`\\hello\test`)).toEqual(
      String.raw`\\\\hello\\test`
    );
  });

  test("escapePath() changes nothing when the input string has no backslashes", () => {
    expect(escapePath("hello-test")).toEqual("hello-test");
  });

  test("normalizePath() changes all backslashes to forward slashes", () => {
    expect(normalizePath(String.raw`\\hello\test`)).toEqual("//hello/test");
  });

  test("normalizePath() changes nothing when the input string has no backslashes", () => {
    expect(normalizePath("hello/test")).toEqual("hello/test");
  });
});
