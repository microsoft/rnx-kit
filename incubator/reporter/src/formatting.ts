import chalk from "chalk";
import {
  inspect,
  type InspectOptions,
  stripVTControlCharacters,
} from "node:util";
import type {
  ColorType,
  ColorValue,
  FormattingOptions,
  FormattingSettings,
  Reporter,
  ReporterFormatting,
} from "./types.ts";

export function noChange<T>(arg: T) {
  return arg;
}

export type Formatting = FormattingSettings & ReporterFormatting;

/**
 * Some ANSI 256 color values by tone for convenience, organized by hue from dark to light. Generally mid-toned so they are
 * discernable on both light and dark backgrounds.
 * - orange: 166, 208, 214
 * - green: 22, 28, 34, 40, 46
 * - cyan-blue: 24, 31, 38, 45
 * - cyan: 37, 44, 51, 87
 * - blue-green: 36, 43, 50 - one shift towards green from cyan
 * - magenta: 163, 201, 207
 * - purple: 128, 129, 135
 * -
 */

const defaultFormatSettings: FormattingSettings = {
  inspectOptions: {
    colors: true,
    depth: 2,
    compact: true,
  },
  colors: {
    duration: 34, // green bright
    durationUnits: 145, // chalk dim setting
    highlight1: 37, // cyan dark
    highlight2: 38, // cyan-blue
    highlight3: 45, // cyan-blue light
    label: 36, // blue-green,
    errorPrefix: "red", // chalk red value
    package: 208, // orange light
    path: 43, // blue-green
    scope: 166, // orange mid
    warnPrefix: "yellowBright", // chalk yellow bright value
    verboseText: "dim", // chalk dim setting
  },
  prefixes: {
    error: "ERROR: ⛔",
    warn: "WARNING: ⚠️",
  },
};

const formattingDefault: Formatting = {
  ...defaultFormatSettings,
  ...createFormattingFunctions(defaultFormatSettings),
};

function applyColorValue(text: string, value: ColorValue): string {
  if (typeof value === "number") {
    return chalk.ansi256(value)(text);
  }
  if (value.startsWith("#")) {
    return chalk.hex(value)(text);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const func = (chalk as any)[value];
    if (typeof func === "function") {
      return func(text);
    }
  }
  return text;
}

function createColorFunction(settings: FormattingSettings): Reporter["color"] {
  const { colors: colorSetting } = settings;
  return (text: string, colorType: ColorType) => {
    if (colorType !== "none") {
      const setting = colorSetting[colorType];
      if (setting) {
        if (Array.isArray(setting)) {
          for (const color of setting) {
            text = applyColorValue(text, color);
          }
        } else {
          text = applyColorValue(text, setting);
        }
      }
    }
    return text;
  };
}

/**
 * @internal
 * @param overrides new options, if any, to apply to the formatting
 * @param baseline original formatting settings to use as a base
 * @returns either the original formatting settings if there are no overrides, or a new formatting object with the overrides applied
 */
export function getFormatting(
  overrides?: FormattingOptions,
  baseline: Formatting = formattingDefault
): Formatting {
  if (overrides) {
    const { colors, inspectOptions, prefixes } = baseline;
    const result = {
      inspectOptions: { ...inspectOptions, ...overrides.inspectOptions },
      colors: { ...colors, ...overrides.colors },
      prefixes: { ...prefixes, ...overrides.prefixes },
    } as Formatting;
    Object.assign(result, createFormattingFunctions(result));
    return result;
  }
  return baseline;
}

/**
 * update the default formatting settings with new options, for all reporters which aren't overriding them in some manner.
 * @param options optional formatting options to apply, if any
 */
export function updateDefaultFormatting(options?: FormattingOptions) {
  const newDefault = getFormatting(options);
  if (newDefault !== formattingDefault) {
    Object.assign(formattingDefault, newDefault);
  }
}

/**
 * Color the given text given the current global default formatting settings.
 * @param text text to color
 * @param type what type of color to apply, one of the ColorType values
 * @returns text with the specified color applied, or unchanged if the type is "none"
 */
export function colorText(text: string, type: ColorType): string {
  return formattingDefault.color(text, type);
}

/**
 * @param time duration in milliseconds to format
 * @returns the duration formatted as a string, with the unit (ms, s, m) appended
 */
export function formatDuration(time: number): string {
  return formattingDefault.formatDuration(time);
}

/**
 * @param moduleName name of the package to format, either scoped or unscoped
 * @returns a formatted package name, with scope and package name colored appropriately
 */
export function formatPackage(moduleName: string): string {
  return formattingDefault.formatPackage(moduleName);
}

/**
 * @param args list of args to serialize, using the current default inspect options
 */
export function serializeArgs(args: unknown[]): string {
  return formattingDefault.serializeArgs(args);
}

/**
 * @internal
 */
export function createFormattingFunctions(
  settings: FormattingSettings
): ReporterFormatting {
  const { inspectOptions } = settings;
  const color = createColorFunction(settings);
  return {
    color,
    serializeArgs: (args: unknown[]) => serializeArgsImpl(inspectOptions, args),
    formatDuration: (time: number) => formatDurationImpl(color, time),
    formatPackage: (pkg: string) => formatPackageImpl(color, pkg),
  };
}

/**
 * Parse a duration in milliseconds and formatting it to a string suitable for display
 * @param duration duration in milliseconds
 * @returns an tuple of the formatted numeric string and the unit (seconds or milliseconds)
 */
function formatDurationImpl(
  color: Reporter["color"],
  duration: number,
  secondToMinuteCutoff = 120
): string {
  let unit = "ms";
  if (duration > secondToMinuteCutoff * 1000) {
    unit = "m";
    duration /= 60000;
  } else if (duration > 1000) {
    unit = "s";
    duration /= 1000;
  }
  const decimalPlaces = Math.max(0, 2 - Math.floor(Math.log10(duration)));
  return `${color(duration.toFixed(decimalPlaces), "duration")}${color(unit, "durationUnits")}`;
}

function formatPackageImpl(color: Reporter["color"], moduleName: string) {
  if (moduleName.startsWith("@")) {
    const parts = moduleName.split("/");
    if (parts.length > 1) {
      const scope = parts[0];
      const pkg = parts.slice(1).join("/");
      return `${color(scope, "scope")}${color("/" + pkg, "package")}`;
    }
  }
  return color(moduleName, "package");
}

/**
 * @param inspectOptions options for node:util.inspect, used to format the arguments, same as console.log
 * @param args args list to serialize
 * @returns a single string with arguments joined together with spaces, terminated with a newline
 */
function serializeArgsImpl(
  inspectOptions: InspectOptions,
  args: unknown[]
): string {
  let msg = args
    .map((arg) =>
      typeof arg === "string" ? arg : inspect(arg, inspectOptions)
    )
    .join(" ");
  msg += "\n";
  return msg;
}

/**
 * @param str target string to pad with spaces
 * @param length desired length
 * @param end pad at the end instead of the start
 * @returns a string padded with spaces to the specified length, ignoring VT control characters
 */
export function padString(
  str: string,
  length: number,
  align: "left" | "right" | "center" = "right"
): string {
  const undecorated = stripVTControlCharacters(str);
  if (undecorated.length < length) {
    const filler = " ".repeat(length - undecorated.length);
    if (align === "left") {
      return str + filler;
    }
    if (align === "right") {
      return filler + str;
    } else if (align === "center") {
      const half = Math.floor(filler.length / 2);
      return filler.slice(0, half) + str + filler.slice(half);
    } else {
      return str + filler;
    }
  }
  return str;
}
