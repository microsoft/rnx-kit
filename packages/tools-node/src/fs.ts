import fs from "fs";
import path from "path";

/**
 * Combine the root directory with each relative file, testing whether or not the file exists.
 * Stop and return as soon as a file is found.
 *
 * @param rootDir Root directory for each file.
 * @param relativeFiles Relative path of each file. `falsey` entries are ignored.
 * @returns Absolute path of the first file that exists, or `undefined`.
 */
export function findFirstFileExists(
  rootDir: string,
  ...relativeFiles: string[]
): string | undefined {
  const normalizedRootDir = path.normalize(rootDir);

  for (const f of relativeFiles) {
    if (f) {
      const p = path.join(normalizedRootDir, path.normalize(f));
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }

  return undefined;
}

/**
 * Create a directory, and all missing parent directories.
 *
 * @param p Directory to create
 */
export function createDirectory(p: string): void {
  fs.mkdirSync(p, { recursive: true, mode: 0o755 });
}
