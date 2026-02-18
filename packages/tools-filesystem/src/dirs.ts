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
): void {
  fs.mkdirSync(path, MKDIR_P_OPTIONS);
}

/**
 * Ensures that the directory for a given file path exists, creating it if
 * necessary.
 * @param p The file path for which to ensure the directory exists.
 */
export function ensureDirForFileSync(
  p: string,
  /** @internal */ fs = nodefs
): void {
  ensureDirSync(path.dirname(p), fs);
}
