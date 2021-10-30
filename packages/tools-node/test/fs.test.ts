import "jest-extended";
import fs from "fs";
import path from "path";
import tempDir from "temp-dir";
import {
  createDirectory,
  findFirstFileExists,
  statSync,
  isDirectory,
  isFile,
} from "../src/fs";

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

  test("createDirectory() sets permissions on the new directory", () => {
    const p = path.join(testTempDir, "testdir");
    expect(fs.existsSync(p)).toBeFalse();
    createDirectory(p);
    const stats = fs.statSync(p);
    expect(stats.isDirectory()).toBeTrue();
    // check for rw|r|r rather than rwx|rx|rx since 'x' doesn't seem to come through on Windows
    expect(stats.mode & 0o644).toEqual(0o644);
  });

  test("createDirectory() creates a parent directory", () => {
    const parent = path.join(testTempDir, "parentdir");
    const p = path.join(parent, "testdir");
    expect(fs.existsSync(parent)).toBeFalse();
    createDirectory(p);
    expect(fs.existsSync(parent)).toBeTrue();
  });

  test("createDirectory() sets permissions on the new parent directory", () => {
    const parent = path.join(testTempDir, "parentdir");
    const p = path.join(parent, "testdir");
    expect(fs.existsSync(parent)).toBeFalse();
    createDirectory(p);
    const stats = fs.statSync(parent);
    expect(stats.isDirectory()).toBeTrue();
    // check for rw|r|r rather than rwx|rx|rx since 'x' doesn't seem to come through on Windows
    expect(stats.mode & 0o644).toEqual(0o644);
  });

  test("statSync() succeeds when given a valid path", () => {
    const stats = statSync(fixtureDir);
    expect(stats).not.toBeNil();
    expect(stats).toBeObject();
  });

  test("statSync() fails when given a bad path", () => {
    const stats = statSync(path.join(fixtureDir, "does-not-exist"));
    expect(stats).toBeNil();
  });

  test("isDirectory() returns true for a directory path", () => {
    expect(isDirectory(fixtureDir)).toBeTrue();
  });

  test("isDirectory() returns false for a file path", () => {
    expect(isDirectory(path.join(fixtureDir, "a.txt"))).toBeFalse();
  });

  test("isDirectory() returns false for a bad path", () => {
    expect(isDirectory(path.join(fixtureDir, "does-not-exist"))).toBeFalse();
  });

  test("isFile() returns true for a file path", () => {
    expect(isFile(path.join(fixtureDir, "a.txt"))).toBeTrue();
  });

  test("isFile() returns false for a directory path", () => {
    expect(isFile(fixtureDir)).toBeFalse();
  });

  test("isFile() returns false for a bad path", () => {
    expect(isFile(path.join(fixtureDir, "does-not-exist"))).toBeFalse();
  });
});
