import { stripVTControlCharacters } from "node:util";
import { ansiColor, bold, dim, encodeAnsi256, encodeColor } from "./colors.ts";

type Alignment = "left" | "right" | "center";

/**
 * Set of ANSI color functions, names are similar to the names used in the chalk library
 */
const formattingDefaults = {
  // add the ansi color values to the formatting
  ...ansiColor,

  /** Bold text */
  bold,
  dim,
  italic: (s: string) => encodeColor(s, 3, 23),
  underline: (s: string) => encodeColor(s, 4, 24),
  strikethrough: (s: string) => encodeColor(s, 9, 29),

  /**
   * Semantic colors used by the reporter module and formatting functions
   */
  durationValue: (s: string) => encodeAnsi256(s, 34),
  durationUnits: dim,
  highlight1: (s: string) => encodeAnsi256(s, 37),
  highlight2: (s: string) => encodeAnsi256(s, 38),
  highlight3: (s: string) => encodeAnsi256(s, 45),
  packageName: (s: string) => encodeAnsi256(s, 208), // orange light
  packageScope: (s: string) => encodeAnsi256(s, 166), // orange mid
  path: (s: string) => encodeAnsi256(s, 43), // blue-green
};
type StaticFormatting = typeof formattingDefaults;
export type FormattingOptions = Partial<StaticFormatting>;

export type Formatter = StaticFormatting & {
  /** format a duration value */
  duration: (time: number) => string;

  /** format a package name */
  package: (pkg: string) => string;

  /** Pads a string, ignoring the color control characters, align defaults to "right" */
  pad: (text: string, length: number, align?: Alignment) => string;
};

const defaultFormatter: Formatter = Object.assign(formattingDefaults, {
  ...createColorBasedFormatters(formattingDefaults),
  pad: padString,
});

export function getFormatter(): Formatter {
  return defaultFormatter;
}

/**
 * Create a new formatter with the given settings
 * @param settings The new override values
 * @param base The base formatter to use, will use default formatter if not provided
 * @returns A new formatter with the updated settings
 */
export function createFormatter(
  settings: FormattingOptions,
  base: Formatter = defaultFormatter
): Formatter {
  const patched = { ...base, ...settings };
  return Object.assign(patched, createColorBasedFormatters(patched));
}

/**
 * Create color-based formatters for the given colors
 * @param colors The colors to use for formatting
 * @returns A set of formatters for duration and package
 */
function createColorBasedFormatters(
  colors: Pick<
    Formatter,
    "durationUnits" | "durationValue" | "packageName" | "packageScope"
  >
): Pick<Formatter, "duration" | "package"> {
  const { durationUnits, durationValue, packageName, packageScope } = colors;
  const secondToMinuteCutoff = 120; // seconds

  return {
    duration: (duration) => {
      let unit = "ms";
      if (duration > secondToMinuteCutoff * 1000) {
        unit = "m";
        duration /= 60000;
      } else if (duration > 1000) {
        unit = "s";
        duration /= 1000;
      }
      const decimalPlaces = Math.max(0, 2 - Math.floor(Math.log10(duration)));
      return `${durationValue(duration.toFixed(decimalPlaces))}${durationUnits(unit)}`;
    },
    package: (pkg) => {
      const parts = pkg.split("/");
      if (parts.length > 1) {
        const scope = parts[0];
        const name = parts.slice(1).join("/");
        return `${packageScope(scope)}${packageName("/" + name)}`;
      }
      return packageName(pkg);
    },
  };
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
  align: Alignment = "right"
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
