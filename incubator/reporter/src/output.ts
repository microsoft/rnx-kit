import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Colorizer, Formatter, LogType, OutputWriter } from "./types.ts";

// at what point do we switch from seconds to minutes in reporting durations
const secondToMinuteCutoff = 120;

// identity function to return the input value unchanged
function identity<T>(x: T): T {
  return x;
}

export const plainTextColorizer: Colorizer = {
  colorsEnabled: false,
  packageName: identity,
  packageScope: identity,
  path: identity,
  durationNumber: identity,
  durationUnit: identity,
  task: identity,
  action: identity,
  reporter: identity,
  errorPrefix: identity,
  warnPrefix: identity,
  msgText: identity,
};

export const defaultColorizer: Colorizer = {
  colorsEnabled: true,
  packageScope: chalk.bold.blue,
  packageName: chalk.bold.cyan,
  path: chalk.blue,
  durationNumber: chalk.green,
  durationUnit: identity,
  task: chalk.bold.green,
  action: chalk.cyan,
  reporter: chalk.bold.blue,
  errorPrefix: chalk.red,
  warnPrefix: chalk.yellow,
  msgText: colorMsgText,
};

export const defaultFormatter: Formatter = {
  messagePrefix: (name: string, colorizer: Colorizer) =>
    `${colorizer.reporter(name)}: `,
  duration: (duration: number, colorizer: Colorizer) => {
    const [number, unit] = formatDuration(duration);
    return `${colorizer.durationNumber(number)}${colorizer.durationUnit(unit)}`;
  },
  messageTypePrefix: (messageType: LogType, colorizer: Colorizer) => {
    switch (messageType) {
      case "error":
        return colorizer.errorPrefix("Error: ");
      case "warn":
        return colorizer.warnPrefix("Warning: ");
      default:
        return "";
    }
  },
  module: formatModuleName,
};

/**
 * @param stream NodeJS WriteStream to write to, typically process.stdout or process.stderr
 * @param plainText override the default colorization of the output
 * @returns
 */
export function createStreamWriter(
  stream: NodeJS.WriteStream,
  plainText?: boolean
): OutputWriter {
  return {
    write: (msg: string) => stream.write(msg),
    plainText,
  };
}

/**
 * @param filePath path, including the file name, to the log file
 * @param flags flags used to open the write stream, defaults to "a" (append)
 * @returns an OutputWriter that writes to the specified file, with colorized output disabled
 */
export function createFileWriter(filePath: string, flags = "a"): OutputWriter {
  const logPath = fileURLToPath(new URL(filePath, import.meta.url));
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const writeHeader = flags === "a" && fs.existsSync(logPath);
  const stream = fs.createWriteStream(logPath, {
    flags,
    encoding: "utf8",
    autoClose: true,
  });
  // write out a session start message if we are opening with append mode and the file already exists
  if (writeHeader) {
    stream.write(
      `<<<====== STARTING LOGGING SESSION at ${new Date().toISOString()} ======>>>\n`
    );
  }
  return {
    write: (msg: string) => stream.write(msg),
    plainText: true,
  };
}

/**
 * Parse a duration in milliseconds and formatting it to a string suitable for display
 * @param duration duration in milliseconds
 * @returns an tuple of the formatted numeric string and the unit (seconds or milliseconds)
 */
export function formatDuration(duration: number): [string, string] {
  let unit = "ms";
  if (duration > secondToMinuteCutoff * 1000) {
    unit = "m";
    duration /= 60000;
  } else if (duration > 1000) {
    unit = "s";
    duration /= 1000;
  }
  const decimalPlaces = Math.max(0, 2 - Math.floor(Math.log10(duration)));
  return [duration.toFixed(decimalPlaces), unit];
}

/**
 * @param moduleName the name of the module to format, splits the scope and package name and styles them differently
 * @param colorizer colors to apply to the module name parts
 */
function formatModuleName(moduleName: string, colorizer: Colorizer) {
  if (moduleName.startsWith("@")) {
    const parts = moduleName.split("/");
    if (parts.length > 1) {
      return `${colorizer.packageScope(parts[0])}/${colorizer.packageName(parts.slice(1).join("/"))}`;
    }
  }
  return colorizer.packageName(moduleName);
}

function colorMsgText(msg: string, logType: LogType): string {
  if (logType === "trace") {
    return chalk.dim(msg);
  }
  return msg;
}
