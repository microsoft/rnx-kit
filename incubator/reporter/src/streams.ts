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
export type GetFileStream = (filePath: string, append?: boolean) => StreamLike;

/**
 * Signature for getting a console stream, can be overridden for testing purposes
 */
export type GetConsoleStream = (target: ConsoleTarget) => StreamLike;

/** open a file stream, either in append or write mode */
function openFileStream(filePath: string, append?: boolean) {
  // ensure the directory exists
  const dir = path.dirname(filePath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // now create/open the stream
  return fs.createWriteStream(filePath, { flags: append ? "a" : "w" });
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
 * In the case where captureWrite is provided, the returned function will be a direct call to
 * the console's original write function, but calls to the stream's write method will also
 * call the provided captureWrite function.
 *
 * This is useful if you want to ensure all console output is captured to a log file, even if
 * not going through the reporter/logger.
 *
 * @param target The console target to get the write function for.
 * @param captureWrite An optional write function to also call when writing to the console.
 * @param prefix An optional prefix to add to each line written to the console.
 * @returns A write function that writes to the console.
 * @internal
 */
export function getConsoleWrite(
  target: ConsoleTarget,
  captureWrite?: WriteToStream
) {
  const stdStream = getStream.console(target);
  if (captureWrite) {
    // capture needs to wrap the original stream's write function
    const writeOriginal = stdStream.write.bind(stdStream);
    // replace the stream's write function to one that also calls captureWrite
    stdStream.write = ((chunk, encoding, cb) => {
      captureWrite(chunk, encoding, cb);
      return writeOriginal(chunk, encoding, cb);
    }) as WriteToStream;
    // now return the direct call to the original write function
    return writeOriginal;
  }
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
  append?: boolean,
  prefix?: string
) {
  // grab the file stream
  const stream = getStream.file(filePath, append);
  return getStreamWrite(stream, prefix);
}
