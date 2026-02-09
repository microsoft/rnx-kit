import nodefs from "node:fs";
import path from "node:path";
import { MKDIR_P_OPTIONS } from "./const";

/**
 * Ensures that a directory exists, creating it if necessary.
 * @param path The path to the directory to ensure.
 */
export function ensureDir(
  path: string, // Force a newline here so that `fs` can be marked as internal
  /** @internal */ fs = nodefs
): void {
  fs.mkdirSync(path, MKDIR_P_OPTIONS);
}

/**
 * Ensures that the directory for a given file path exists, creating it if
 * necessary.
 * @param p The file path for which to ensure the directory exists.
 */
export function ensureDirForFile(
  p: string,
  /** @internal */ fs = nodefs
): void {
  ensureDir(path.dirname(p), fs);
}
