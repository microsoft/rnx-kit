import "jest-extended";
import fs from "fs";
import path from "path";
import { findFirstFileExists } from "../../src/node/fs";

describe("Node > FS", () => {
  const fixtureDir = path.resolve(__dirname, "__fixtures__");

  beforeAll(() => {
    expect(fs.existsSync(fixtureDir)).toBeTrue();
  });

  test("findFirstFileExists() returns undefined when no files are given", () => {
    expect(findFirstFileExists(fixtureDir)).toBeUndefined();
  });

  test("findFirstFileExists() returns undefined when no files are found", () => {
    expect(
      findFirstFileExists(fixtureDir, "does-not-exist", "also-missing")
    ).toBeUndefined();
  });

  test("findFirstFileExists() returns the first file that exists", () => {
    expect(findFirstFileExists(fixtureDir, "a.txt", "b.txt")).toMatch(
      /[/\\]a.txt$/
    );
    expect(findFirstFileExists(fixtureDir, "b.txt", "a.txt")).toMatch(
      /[/\\]b.txt$/
    );
  });
});
