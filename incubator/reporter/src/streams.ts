import fs from "node:fs";
import path from "node:path";

export type ConsoleTarget = Extract<keyof typeof process, "stdout" | "stderr">;

/**
 * The complex signature for writing to a stream
 */
export type WriteToStream = typeof process.stdout.write;

/**
 * A stream-like object that has a write function, compatible with file and stdio streams.
 */
export type StreamLike = { write: WriteToStream };

/**
 * Signature for opening a file stream, can be overridden for testing purposes
 */
type GetFileStream = (
  filePath: string,
  append?: "append" | "overwrite"
) => StreamLike;

/**
 * Signature for getting a console stream, can be overridden for testing purposes
 */
type GetConsoleStream = (target: ConsoleTarget) => StreamLike;

/** open a file stream, either in append or write mode */
function openFileStream(
  filePath: string,
  append: "append" | "overwrite" = "overwrite"
) {
  // ensure the directory exists
  const dir = path.dirname(filePath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  }
  // now create/open the stream
  return fs.createWriteStream(filePath, {
    flags: append === "append" ? "a" : "w",
  });
}

/** get either stdout or stderr, depending on target */
function getConsoleStream(target: ConsoleTarget) {
  const stream = process[target];
  return stream;
}

/**
 * Object containing functions to open file and console streams. Can be overridden for testing purposes
 * but not exposed externally.
 * @internal
 */
export const getStream: { file: GetFileStream; console: GetConsoleStream } = {
  file: openFileStream,
  console: getConsoleStream,
};

/**
 * Get a write function for the specified console target. This also allows for capturing all
 * console output by providing a captureWrite function.
 *
 * @param target The console target to get the write function for.
 * @returns A write function that writes to the console.
 * @internal
 */
export function getConsoleWrite(target: ConsoleTarget) {
  const stdStream = getStream.console(target);
  // in the non-capture case return a write function that takes the stream into account,
  // which means that it will update if someone else captures the stream
  return getStreamWrite(stdStream);
}

/**
 * Get a write function for the specified stream.
 * @param stream the stream to write to
 * @param prefix An optional prefix to add to each line written to the stream.
 * @returns A write function that writes to the stream.
 * @internal
 */
export function getStreamWrite(
  stream: StreamLike,
  prefix?: string
): WriteToStream {
  return ((str, encoding, cb) => {
    // note we only inject the prefix when it is a simple string, with complex buffer types they pass through as is
    if (prefix && typeof str === "string") {
      str = prefix + str;
    }
    return stream.write(str, encoding, cb);
  }) as WriteToStream;
}

/**
 * Opens a file stream for writing, also ensures the directory exists.
 * @param filePath The path to the file to write to.
 * @param append If true, the file will be opened in append mode.
 * @param prefix An optional prefix to add to each line written to the file.
 * @returns A writable stream for the specified file.
 * @internal
 */
export function openFileWrite(
  filePath: string,
  append: "append" | "overwrite" = "overwrite",
  prefix?: string
) {
  // grab the file stream
  const stream = getStream.file(filePath, append);
  return getStreamWrite(stream, prefix);
}
