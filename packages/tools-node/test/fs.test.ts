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
    expect(fs.existsSync(fixtureDir)).toBe(true);
    expect(fs.existsSync(tempDir)).toBe(true);
  });

  let testTempDir: string;

  beforeEach(() => {
    testTempDir = fs.mkdtempSync(
      path.join(tempDir, "rnx-kit-tools-node-fs-test-")
    );
  });

  afterEach(() => {
    fs.rmSync(testTempDir, { maxRetries: 5, recursive: true });
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
    expect(fs.existsSync(p)).toBe(false);
    createDirectory(p);
    expect(fs.existsSync(p)).toBe(true);
  });

  test("createDirectory() sets permissions on the new directory", () => {
    const p = path.join(testTempDir, "testdir");
    expect(fs.existsSync(p)).toBe(false);
    createDirectory(p);
    const stats = fs.statSync(p);
    expect(stats.isDirectory()).toBe(true);
    // check for rw|r|r rather than rwx|rx|rx since 'x' doesn't seem to come through on Windows
    expect(stats.mode & 0o644).toEqual(0o644);
  });

  test("createDirectory() creates a parent directory", () => {
    const parent = path.join(testTempDir, "parentdir");
    const p = path.join(parent, "testdir");
    expect(fs.existsSync(parent)).toBe(false);
    createDirectory(p);
    expect(fs.existsSync(parent)).toBe(true);
  });

  test("createDirectory() sets permissions on the new parent directory", () => {
    const parent = path.join(testTempDir, "parentdir");
    const p = path.join(parent, "testdir");
    expect(fs.existsSync(parent)).toBe(false);
    createDirectory(p);
    const stats = fs.statSync(parent);
    expect(stats.isDirectory()).toBe(true);
    // check for rw|r|r rather than rwx|rx|rx since 'x' doesn't seem to come through on Windows
    expect(stats.mode & 0o644).toEqual(0o644);
  });

  test("statSync() succeeds when given a valid path", () => {
    const stats = statSync(fixtureDir);
    expect(stats).toBeTruthy();
    expect(typeof stats).toBe("object");
  });

  test("statSync() fails when given a bad path", () => {
    const stats = statSync(path.join(fixtureDir, "does-not-exist"));
    expect(stats).toBeUndefined();
  });

  test("isDirectory() returns true for a directory path", () => {
    expect(isDirectory(fixtureDir)).toBe(true);
  });

  test("isDirectory() returns false for a file path", () => {
    expect(isDirectory(path.join(fixtureDir, "a.txt"))).toBe(false);
  });

  test("isDirectory() returns false for a bad path", () => {
    expect(isDirectory(path.join(fixtureDir, "does-not-exist"))).toBe(false);
  });

  test("isFile() returns true for a file path", () => {
    expect(isFile(path.join(fixtureDir, "a.txt"))).toBe(true);
  });

  test("isFile() returns false for a directory path", () => {
    expect(isFile(fixtureDir)).toBe(false);
  });

  test("isFile() returns false for a bad path", () => {
    expect(isFile(path.join(fixtureDir, "does-not-exist"))).toBe(false);
  });
});
