import "jest-extended";
import fs from "fs";
import path from "path";
import tempDir from "temp-dir";
import { createDirectory, findFirstFileExists } from "../src/fs";

describe("Node > FS", () => {
  const fixtureDir = path.resolve(__dirname, "__fixtures__");

  beforeAll(() => {
    expect(fs.existsSync(fixtureDir)).toBeTrue();
    expect(fs.existsSync(tempDir)).toBeTrue();
  });

  let testTempDir: string;

  beforeEach(() => {
    testTempDir = fs.mkdtempSync(
      path.join(tempDir, "rnx-kit-tools-node-fs-test-")
    );
  });

  afterEach(() => {
    fs.rmdirSync(testTempDir, { maxRetries: 5, recursive: true });
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

  test("createDirectory() creates a directory", () => {
    const p = path.join(testTempDir, "testdir");
    expect(fs.existsSync(p)).toBeFalse();
    createDirectory(p);
    expect(fs.existsSync(p)).toBeTrue();
  });

  test("createDirectory() creates a parent directory", () => {
    const parent = path.join(testTempDir, "parentdir");
    const p = path.join(parent, "testdir");
    expect(fs.existsSync(parent)).toBeFalse();
    createDirectory(p);
    expect(fs.existsSync(parent)).toBeTrue();
  });
});
