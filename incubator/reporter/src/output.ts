import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  inspect,
  stripVTControlCharacters,
  type InspectOptions,
} from "node:util";
import { noChange } from "./formatting.ts";
import type { LogLevel, ReporterSettings } from "./types.ts";

export type WriteFunction = (msg: string) => void;

type AllWrites = Record<LogLevel, WriteFunction>;
export type WriteFunctions = Pick<AllWrites, "error"> &
  Partial<Omit<AllWrites, "error">>;
export type OutputSettings = Pick<ReporterSettings, "level" | "file">;
export type OutputOptions = Partial<OutputSettings>;

const writeStdout: WriteFunction = process.stdout.write.bind(process.stdout);
const writeStderr: WriteFunction = process.stderr.write.bind(process.stderr);

type LevelOptions = {
  value: number;
  write: WriteFunction;
};

const defaultLevel: LogLevel = "log";
const levelOptions: Record<LogLevel, LevelOptions> = {
  error: {
    value: 0,
    write: writeStderr,
  },
  warn: {
    value: 1,
    write: writeStderr,
  },
  log: {
    value: 2,
    write: writeStdout,
  },
  verbose: {
    value: 3,
    write: writeStdout,
  },
};

const nonErrorLevels: LogLevel[] = ["warn", "log", "verbose"];
export const allLogLevels: LogLevel[] = ["error", ...nonErrorLevels];

export function supportsLevel(
  level: LogLevel,
  optionLevel: LogLevel = defaultLevel
): boolean {
  const optionValue =
    levelOptions[optionLevel]?.value ?? levelOptions.error.value;
  return levelOptions[level].value <= optionValue;
}

/**
 * @param previous original settings for the reporter, either defaults or parent settings
 * @param overrides new options being applied to the reporter
 * @returns whether or not the output settings are changing
 */
export function outputSettingsChanging(
  previous: OutputSettings,
  overrides?: OutputOptions
): boolean {
  if (!overrides) {
    return false;
  }

  if (overrides.level && previous.level !== overrides.level) {
    return true;
  }

  const oldFile = previous.file;
  if (overrides.file && oldFile) {
    const newFile = { ...oldFile, ...overrides.file };
    if (
      oldFile.target !== newFile.target ||
      oldFile.level !== newFile.level ||
      oldFile.writeFlags !== newFile.writeFlags ||
      oldFile.colors !== newFile.colors
    ) {
      return true;
    }
  }
  return false;
}

/**
 *
 * @param settings the baseline settings for the output, passed pre-merge to see if we can use parent write functions
 * @param options the overrides being used to create a given reporter
 * @param parentWrites write functions associated with the settings, if any
 * @returns a set of write functions, defined according to the settings and options provided
 */
export function getWriteFunctions(
  settings: OutputSettings,
  changed?: boolean,
  parentWrites?: WriteFunctions
): WriteFunctions {
  // if there are parent writes, we can use them if they match the current settings
  if (parentWrites && !changed) {
    return parentWrites;
  }

  // things are changing, build these again
  const consoleWrites = getConsoleWrites(settings.level);
  const fileWrites = getFileWrites(settings.level, settings.file);
  return mergeWrites(consoleWrites, fileWrites);
}

function getConsoleWrites(setting: LogLevel) {
  const results: WriteFunctions = {
    error: levelOptions.error.write,
  };
  for (const level of nonErrorLevels) {
    if (supportsLevel(level, setting)) {
      results[level] = levelOptions[level].write;
    }
  }
  return results;
}

function getFileWrites(
  baseLevel: LogLevel,
  fileSettings?: OutputSettings["file"]
): Partial<WriteFunctions> {
  const results: Partial<WriteFunctions> = {};
  const fileStream = getFileStream(fileSettings);
  if (fileStream) {
    const { colors, level: settingLevel = baseLevel } = fileSettings || {};
    const fileTransform = colors ? noChange : stripVTControlCharacters;
    const writeFile = (msg: string) => fileStream.write(fileTransform(msg));
    for (const level of allLogLevels) {
      if (supportsLevel(level, settingLevel)) {
        results[level] = writeFile;
      }
    }
  }
  return results;
}

function mergeWrites(
  writes: WriteFunctions,
  fileWrites: Partial<WriteFunctions>
): WriteFunctions {
  const results: WriteFunctions = { ...writes };
  for (const level of allLogLevels) {
    const write1 = writes[level];
    const write2 = fileWrites[level];
    if (write1 && write2) {
      results[level] = (msg: string) => {
        write1(msg);
        write2(msg);
      };
    } else if (write1) {
      results[level] = write1;
    } else if (write2) {
      results[level] = write2;
    }
  }
  return results;
}

export function getFileStream(
  settings: OutputSettings["file"]
): fs.WriteStream | undefined {
  if (settings?.target) {
    const { target, writeFlags } = settings;
    if (typeof target === "string") {
      // if the target is a string, create a write stream, updating the settings so we don't open it twice
      const logPath = fileURLToPath(new URL(target, import.meta.url));
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      settings.target = fs.createWriteStream(logPath, {
        encoding: "utf8",
        flags: writeFlags || "w",
      });
      return settings.target;
    } else {
      // if the target is already a write stream, return it
      return target;
    }
  }
  return undefined;
}

/**
 * @param inspectOptions options for node:util.inspect, used to format the arguments, same as console.log
 * @param args args list to serialize
 * @returns a single string with arguments joined together with spaces, terminated with a newline
 */
export function serializeArgs(
  inspectOptions: InspectOptions,
  ...args: unknown[]
): string {
  let msg = args
    .map((arg) =>
      typeof arg === "string" ? arg : inspect(arg, inspectOptions)
    )
    .join(" ");
  msg += "\n";
  return msg;
}
