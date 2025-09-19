import type { LogLevel } from "./levels.ts";
import { createOutput, mergeOutput } from "./output.ts";
import { createReporter } from "./reporter.ts";
import { getConsoleWrite, openFileWrite } from "./streams.ts";
import type { ReporterOptions } from "./types.ts";

export type CascadeSettings = {
  /**
   * Log level to use for this reporter and its children, defaults to 'log' if not specified
   */
  level?: LogLevel;

  /**
   * Optional file output settings. If specified, will create a file output writer for this reporter and its children.
   */
  file?: {
    /**
     * Override log level for file output, defaults to the same level as 'level' if not specified
     */
    level?: LogLevel;

    /**
     * File path to write logs to.
     */
    out: string;

    /**
     * Optional secondary error file path to write warnings and errors to.
     */
    err?: string;

    /**
     * If true, will hook stdout/stderr to the file output, defaults to false
     */
    capture?: boolean;
  };

  /**
   * Current process depth of the cascade. Root process is depth 0. Also dictates whether the file
   * output will be opened empty or in append mode.
   */
  depth?: number;
};

/**
 * Create a cascading reporter that inherits settings from the environment.
 * @param envKey Environment variable key to use for cascading settings
 * @param defaultSettings Default settings to use if no environment variable is found
 * @param options Additional reporter options
 * @returns A new reporter instance, configured via the environment variable or the provided defaults
 */
export function createCascadingReporter(
  envKey: string,
  defaultSettings?: CascadeSettings,
  options: ReporterOptions = { name: envKey }
) {
  const settings = queryCascadeSettings(envKey) ?? defaultSettings;
  if (!settings) {
    return undefined;
  }

  const level = settings?.level ?? "log";
  const fileLevel = settings?.file?.level ?? level;
  const capture = settings?.file?.capture;

  // create the file output writer if file settings are provided
  const [fileOutFn, fileErrFn] = createFileWriteFunctions(
    settings.file,
    settings.depth ? true : false
  );
  const fileOutput = fileOutFn
    ? createOutput(fileLevel, fileOutFn, fileErrFn)
    : undefined;

  // create the console output, capturing stdout/stderr if requested
  const stdOutFn = getConsoleWrite("stdout", capture ? fileOutFn : undefined);
  const stdErrFn = getConsoleWrite("stderr", capture ? fileErrFn : undefined);
  const consoleOutput = createOutput(level, stdOutFn, stdErrFn);

  const reporterOptions: ReporterOptions = {
    ...options,
    output: fileOutput ? mergeOutput(consoleOutput, fileOutput) : consoleOutput,
  };
  // set the environment variable so child processes can inherit the settings
  process.env[envKey] = JSON.stringify(settings);
  return createReporter(reporterOptions);
}

/**
 * Create file write functions for the specified output options.
 * @param options file output options
 * @param append If true, the file will be opened in append mode.
 * @returns An array of write functions for the specified output options.
 * @internal
 */
export function createFileWriteFunctions(
  options?: { out: string; err?: string },
  append?: boolean
) {
  if (options && options.out) {
    const { out, err } = options;

    const filePrefix = `[PID: ${process.pid}] `;

    // configure the main output stream
    const writeOut = openFileWrite(out, append, filePrefix);

    // configure the error writer if one is specified and is different from the output writer
    const writeErr =
      err && err !== out ? openFileWrite(err, append, filePrefix) : writeOut;

    // typecasting to handle inference issues with function type overrides
    return [writeOut, writeErr];
  }
  return [undefined, undefined];
}

/**
 * Query the environment variable for cascade settings.
 * @param envKey Environment variable key to query for cascade settings
 * @returns The cascade settings from the environment variable, or undefined if not found
 * @internal
 */
export function queryCascadeSettings(
  envKey: string
): CascadeSettings | undefined {
  const value = process.env[envKey];
  if (value) {
    try {
      const settings = JSON.parse(value) as CascadeSettings;
      settings.depth = (settings.depth ?? 0) + 1;
      return settings;
    } catch {
      // ignore invalid JSON and just return undefined
    }
  }
  return undefined;
}
