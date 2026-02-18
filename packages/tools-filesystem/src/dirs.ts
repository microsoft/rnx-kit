import nodefs from "node:fs";
import path from "node:path";
import { MKDIR_P_OPTIONS } from "./const.ts";

/**
 * Ensures that a directory exists, creating it if necessary.
 * @param path The path to the directory to ensure.
 */
export function ensureDirSync(
  path: string, // Force a newline here so that `fs` can be marked as internal
  /** @internal */ fs = nodefs
): string | undefined {
  return fs.mkdirSync(path, MKDIR_P_OPTIONS);
}

/**
 * Asynchronously ensures that a directory exists, creating it if necessary.
 * @param path The path to the directory to ensure.
 * @returns A promise that resolves to the path of the directory if it was created, or undefined if it already existed.
 */
export function ensureDir(
  path: string, // Force a newline here so that `fs` can be marked as internal
  /** @internal */ fs = nodefs
): Promise<string | undefined> {
  return fs.promises.mkdir(path, MKDIR_P_OPTIONS);
}

/**
 * Ensures that the directory for a given file path exists, creating it if
 * necessary.
 * @param p The file path for which to ensure the directory exists.
 * @returns The path of the directory if it was created, or undefined if it already existed.
 */
export function ensureDirForFileSync(
  p: string, // Force a newline here so that `fs` can be marked as internal
  /** @internal */ fs = nodefs
) {
  return ensureDirSync(path.dirname(p), fs);
}

/**
 * Asynchronously ensures that the directory for a given file path exists, creating it if necessary.
 * @param p The file path for which to ensure the directory exists.
 * @returns A promise that resolves to the path of the directory if it was created, or undefined if it already existed.
 */
export function ensureDirForFile(
  p: string,
  /** @internal */ fs = nodefs
): Promise<string | undefined> {
  return ensureDir(path.dirname(p), fs);
}
