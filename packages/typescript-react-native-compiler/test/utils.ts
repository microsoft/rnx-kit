import fs from "fs";
import path from "path";
import semverSatisfies from "semver/functions/satisfies";
import tempDir from "temp-dir";

/**
 * Create a temporary directory for testing, using the given pattern as a
 * unique name differentiator.
 *
 * @param pattern Pattern to use as part of the directory name
 * @returns Full path to the directory
 */
export function createTestDirectory(pattern: string): string {
  return fs.mkdtempSync(path.join(tempDir, pattern));
}

// Node 14.14.0 introduced a new method, fs.rm(), to replace fs.rmdir().
// As of Node 16.18, deprecation warnings are showing up, which is making
// the Jest console output less readable.
const rmSync = semverSatisfies(process.versions["node"], ">= 14.14.0")
  ? fs.rmSync
  : fs.rmdirSync;

/**
 * Remove a test directory and all of its children.
 *
 * @param p Full path to the directory
 */
export function removeTestDirectory(p: string): void {
  rmSync(p, { maxRetries: 5, recursive: true });
}
