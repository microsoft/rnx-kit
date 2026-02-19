import nodefs from "node:fs";
import { WITH_UTF8_ENCODING } from "./const.ts";
import { parseJSON, serializeJSON } from "./json.ts";

/**
 * Synchronously reads the content of a file as a UTF-8 string.
 *
 * @param filePath path to the file to read
 * @param fs filesystem module to use (defaults to Node's fs)
 * @returns the content of the file as a UTF-8 string
 */
export function readTextFileSync(
  filePath: string,
  /** @internal */ fs = nodefs
): string {
  return fs.readFileSync(filePath, WITH_UTF8_ENCODING);
}

/**
 * Asynchronously reads the content of a file as a UTF-8 string.
 *
 * @param filePath path to the file to read
 * @param fs filesystem module to use (defaults to Node's fs)
 * @returns a promise that resolves to the content of the file as a UTF-8 string
 */
export async function readTextFile(
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
export function readJSONFileSync<T = ReturnType<typeof JSON.parse>>(
  filePath: string,
  /** @internal */ fs = nodefs
): T {
  return parseJSON<T>(readTextFileSync(filePath, fs));
}

/**
 * Asynchronously reads the content of a file as JSON, stripping a UTF-8 BOM if present. This is a convenience method that combines
 * readTextFile with JSON.parse, and is useful for reading JSON files without having to worry about BOMs causing parse failures.
 *
 * @param filePath path to the JSON file to read
 * @param fs the filesystem module to use (defaults to Node's fs)
 * @returns the parsed JSON object, optionally cast to type T
 */
export async function readJSONFile<T = ReturnType<typeof JSON.parse>>(
  filePath: string,
  /** @internal */ fs = nodefs
): Promise<T> {
  const content = await readTextFile(filePath, fs);
  return parseJSON<T>(content);
}

/**
 * Writes specified data to a file, assuming the data is UTF-8 encoded text.
 * @param path The path to the file to write.
 * @param data The UTF-8 encoded data to write to the file.
 */
export function writeTextFileSync(
  path: string,
  data: string,
  /** @internal */ fs = nodefs
): void {
  data = data.endsWith("\n") ? data : data + "\n";
  fs.writeFileSync(path, data, WITH_UTF8_ENCODING);
}

/**
 * Writes specified data to a file asynchronously, assuming the data is UTF-8 encoded text.
 * @param path The path to the file to write.
 * @param data The UTF-8 encoded data to write to the file.
 * @returns A promise that resolves when the file has been written.
 */
export function writeTextFile(
  path: string,
  data: string,
  /** @internal */ fs = nodefs
): Promise<void> {
  data = data.endsWith("\n") ? data : data + "\n";
  return fs.promises.writeFile(path, data, WITH_UTF8_ENCODING);
}

/**
 * Writes specified data to a file, serialized as JSON format.
 * @param path The path to the file to write.
 * @param data The data to write to the file.
 * @param [space=2] The number of spaces to use for indentation in the JSON output (0 to disable pretty-printing).
 */
export function writeJSONFileSync(
  path: string,
  data: unknown,
  space: string | number = 2,
  /** @internal */ fs = nodefs
): void {
  writeTextFileSync(path, serializeJSON(data, space), fs);
}

/**
 * Writes specified data to a file asynchronously, serialized as JSON format.
 * @param path The path to the file to write.
 * @param data The data to write to the file.
 * @param [space=2] The number of spaces to use for indentation in the JSON output (0 to disable pretty-printing).
 * @returns A promise that resolves when the file has been written.
 */
export function writeJSONFile(
  path: string,
  data: unknown,
  space: string | number = 2,
  /** @internal */ fs = nodefs
): Promise<void> {
  return writeTextFile(path, serializeJSON(data, space), fs);
}
