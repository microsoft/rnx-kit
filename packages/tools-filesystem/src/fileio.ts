import nodefs from "node:fs";
import { WITH_UTF8_ENCODING } from "./const.ts";
import { parseJson, serializeJson } from "./json.ts";

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
  return parseJson<T>(readFileSync(filePath, fs));
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
  const content = await readFile(filePath, fs);
  return parseJson<T>(content);
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
  data = data.endsWith("\n") ? data : data + "\n";
  fs.writeFileSync(path, data, WITH_UTF8_ENCODING);
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
  writeTextFile(path, serializeJson(data, space), fs);
}
