import nodefs from "node:fs";
import {
  DEFAULT_ENCODING,
  DEFAULT_FILE_MODE,
  WITH_UTF8_ENCODING,
} from "./const";

/**
 * Strip a UTF-8 BOM (Byte Order Mark) from the beginning of a string, if present.
 * @param content file content to strip of a BOM (if present)
 * @returns either the content (if no BOM was present) or the content with the leading BOM removed
 */
function stripBOM(content: string): string {
  // check for a UTF-8 BOM and remove it if present, since it will cause JSON.parse to fail
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

/**
 * Synchronously reads the content of a file as a UTF-8 string, caching the result on the FSEntry. If the content
 * has already been read and cached, it returns the cached content instead of reading from the filesystem again.
 *
 * @param filePath path to the file to read
 * @param fs filesystem module to use (defaults to Node's fs)
 * @returns the content of the file as a UTF-8 string
 */
export function readFileSync(
  filePath: string,
  /** @internal */ fs = nodefs
): string {
  return fs.readFileSync(filePath, WITH_UTF8_ENCODING);
}

/**
 * Asynchronously reads the content of a file as a UTF-8 string, caching the result on the FSEntry. If the content
 * has already been read and cached, it returns the cached content instead of reading from the filesystem again.
 *
 * @param filePath path to the file to read
 * @param fs filesystem module to use (defaults to Node's fs)
 * @returns a promise that resolves to the content of the file as a UTF-8 string
 */
export async function readFile(
  filePath: string,
  /** @internal */ fs = nodefs
): Promise<string> {
  return fs.promises.readFile(filePath, WITH_UTF8_ENCODING);
}

/**
 * Synchronously reads the content of a file as JSON, stripping a UTF-8 BOM if present. This is a convenience method that combines
 * readFileSync with JSON.parse, and is useful for reading JSON files without having to worry about BOMs causing parse failures.
 *
 * @param filePath path to the JSON file to read
 * @param fs filesystem module to use (defaults to Node's fs)
 * @returns the parsed JSON object, optionally cast to type T
 */
export function readJsonSync<T = ReturnType<typeof JSON.parse>>(
  filePath: string,
  /** @internal */ fs = nodefs
): T {
  const content = stripBOM(readFileSync(filePath, fs));
  return JSON.parse(content) as T;
}

/**
 * Asynchronously reads the content of a file as JSON, stripping a UTF-8 BOM if present. This is a convenience method that combines
 * readFile with JSON.parse, and is useful for reading JSON files without having to worry about BOMs causing parse failures.
 *
 * @param filePath path to the JSON file to read
 * @param fs the filesystem module to use (defaults to Node's fs)
 * @returns the parsed JSON object, optionally cast to type T
 */
export async function readJson<T = ReturnType<typeof JSON.parse>>(
  filePath: string,
  /** @internal */ fs = nodefs
): Promise<T> {
  const content = stripBOM(await readFile(filePath, fs));
  return JSON.parse(content) as T;
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
