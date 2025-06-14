import fs from "node:fs";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import { noChange } from "./formatting.ts";
import {
  allLogLevels,
  defaultLevel,
  nonErrorLevels,
  supportsLevel,
  useErrorStream,
} from "./levels.ts";
import type { LogLevel, OutputOptions, OutputSettings } from "./types.ts";

export type WriteFunction = (msg: string) => void;

type AllWrites = Record<LogLevel, WriteFunction>;
export type WriteFunctions = Pick<AllWrites, "error"> &
  Partial<Omit<AllWrites, "error">>;

export type Output = OutputSettings & WriteFunctions;

const writeStdout: WriteFunction = process.stdout.write.bind(process.stdout);
const writeStderr: WriteFunction = process.stderr.write.bind(process.stderr);

const defaultOutput = buildOutput({ level: defaultLevel } as Output, {});

export function updateOutputDefaults(overrides?: OutputOptions) {
  // if we have overrides and they change settings regenerate the output functions
  if (overrides && outputSettingsChanging(defaultOutput, overrides)) {
    Object.assign(defaultOutput, getOutput(overrides));
  }
}

export function getOutput(
  overrides?: OutputOptions,
  baseline: Output | undefined = defaultOutput
): Output {
  // if there are no overrides, return the default output
  if (!overrides || !outputSettingsChanging(baseline, overrides)) {
    return { ...baseline };
  }
  return buildOutput(defaultOutput, overrides);
}

function buildOutput(baseline: Output, overrides: OutputOptions) {
  // update the settings to have the new values
  const result = { ...baseline, ...overrides };
  if (baseline.file && overrides.file) {
    result.file = { ...baseline.file, ...overrides.file };
  }

  // rebuild the write functions
  const consoleWrites = getConsoleWrites(result.level);
  const fileWrites = getFileWrites(result.level, result.file);
  combineWrites(result, consoleWrites, fileWrites);

  return result;
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

function getConsoleWrites(setting: LogLevel) {
  const results: WriteFunctions = {
    error: writeStderr,
  };
  for (const level of nonErrorLevels) {
    if (supportsLevel(level, setting)) {
      results[level] = useErrorStream(level) ? writeStderr : writeStdout;
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

function combineWrites(
  target: WriteFunctions,
  writes: WriteFunctions,
  fileWrites: Partial<WriteFunctions>
) {
  for (const level of allLogLevels) {
    const write1 = writes[level];
    const write2 = fileWrites[level];
    if (write1 && write2) {
      target[level] = (msg: string) => {
        write1(msg);
        write2(msg);
      };
    } else if (write1) {
      target[level] = write1;
    } else if (write2) {
      target[level] = write2;
    } else if (level !== "error") {
      // if there is no write function, set it to undefined
      target[level] = undefined;
    }
  }
  return target;
}

export function getFileStream(
  settings: OutputSettings["file"]
): fs.WriteStream | undefined {
  if (settings?.target) {
    const { target, writeFlags } = settings;
    if (typeof target === "string") {
      // if the target is a string, create a write stream, updating the settings so we don't open it twice
      // Resolve the log path relative to the current file's directory
      const logPath = path.isAbsolute(target) ? target : path.resolve(target);
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
