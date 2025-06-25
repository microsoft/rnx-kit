import * as nodefs from "node:fs";
import * as path from "node:path";

const DEFAULT_ENCODING = "utf-8";
const DEFAULT_DIR_MODE = 0o755; // rwxr-xr-x (read/write/execute for owner, read/execute for group and others)
const DEFAULT_FILE_MODE = 0o644; // rw-r--r-- (read/write for owner, read for group and others)
const MKDIR_P_OPTIONS = { recursive: true, mode: DEFAULT_DIR_MODE } as const;

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

/**
 * Writes specified data to a file, assuming the data is UTF-8 encoded text.
 * @param path The path to the file to write.
 * @param data The UTF-8 encoded data to write to the file.
 */
export function writeTextFile(
  path: string,
  data: string,
  /** @internal */ fs = nodefs
): void {
  const fd = fs.openSync(path, "w", DEFAULT_FILE_MODE);
  fs.writeSync(fd, data, null, DEFAULT_ENCODING);
  if (!data.endsWith("\n")) {
    fs.writeSync(fd, "\n", null, DEFAULT_ENCODING);
  }
  fs.closeSync(fd);
}

/**
 * Writes specified data to a file, serialized as JSON format.
 * @param path The path to the file to write.
 * @param data The data to write to the file.
 * @param [space=2] The number of spaces to use for indentation in the JSON output (0 to disable pretty-printing).
 */
export function writeJSONFile(
  path: string,
  data: unknown,
  space: string | number = 2,
  /** @internal */ fs = nodefs
): void {
  writeTextFile(path, JSON.stringify(data, undefined, space), fs);
}
