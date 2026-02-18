/**
 * Strip a UTF-8 BOM (Byte Order Mark) from the beginning of a string, if present.
 * @param content file content to strip of a BOM (if present)
 * @returns either the content (if no BOM was present) or the content with the leading BOM removed
 */
export function stripBOM(content: string): string {
  // check for a UTF-8 BOM and remove it if present, since it will cause JSON.parse to fail
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

/**
 * Parse JSON via the internal JSON.parse, checking for and stripping a UTF-8 byte order mark
 * if present to avoid parse failures.
 * @param content text content to parse as JSON, potentially with a leading UTF-8 BOM
 * @returns parsed JSON object, optionally cast to type T
 */
export function parseJson<T = ReturnType<typeof JSON.parse>>(
  content: string
): T {
  return JSON.parse(stripBOM(content)) as T;
}

/**
 * Serialize data to JSON format, optionally pretty-printing with a specified number of spaces.
 * @param data the data to serialize to JSON
 * @param space the number of spaces to use for indentation in the JSON output (0 to disable pretty-printing)
 * @returns the serialized JSON string
 */
export function serializeJson(
  data: unknown,
  space: string | number = 2
): string {
  return JSON.stringify(data, null, space) + "\n";
}
