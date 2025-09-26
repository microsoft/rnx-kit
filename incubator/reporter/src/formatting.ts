import { stripVTControlCharacters } from "node:util";
import type { AnsiColorFunctions, FontStyleFunctions } from "./colors.ts";
import { ansiColor, encodeAnsi256, fontStyle } from "./colors.ts";
import type { TextTransform } from "./types.ts";
import { identity, lazyInit } from "./utils.ts";

type Alignment = "left" | "right" | "center";

/**
 * Static formatting functions, these do not depend on each other
 */
type StaticFormatting = AnsiColorFunctions &
  FontStyleFunctions & {
    /** Semantic coloring functions */
    durationValue: TextTransform;
    durationUnits: TextTransform;
    highlight1: TextTransform;
    highlight2: TextTransform;
    highlight3: TextTransform;
    packageName: TextTransform;
    packageScope: TextTransform;
    path: TextTransform;

    /** Pads a string, ignoring the color control characters, align defaults to "right" */
    pad: (text: string, length: number, align?: Alignment) => string;
  };

/**
 * Overridable formatting options, these can override any of the static formatting functions
 */
export type FormattingOptions = Partial<StaticFormatting>;

/**
 * A full set of formatting functions, including static formatters, and dynamic formatters
 * which will pull values from the static formatters as needed.
 */
export type Formatter = StaticFormatting & {
  /** format a duration value */
  duration: (time: number) => string;

  /** format a package name */
  package: (pkg: string) => string;
};

/**
 * Get a default formatter with colors and formatting functions all implemented. Built
 * on demand, so it won't be created unless requested.
 */
export const getFormatter = lazyInit<Formatter>(() => {
  const staticFormatting: StaticFormatting = {
    /** ansi colors */
    ...ansiColor(),

    /** bold, dim, italic, etc. */
    ...fontStyle(),

    /** Semantic colors used by the reporter module and formatting functions */
    durationValue: (s) => encodeAnsi256(s, 34),
    durationUnits: fontStyle().dim,
    highlight1: (s) => encodeAnsi256(s, 37),
    highlight2: (s) => encodeAnsi256(s, 38),
    highlight3: (s) => encodeAnsi256(s, 45),
    packageName: (s) => encodeAnsi256(s, 208), // orange light
    packageScope: (s) => encodeAnsi256(s, 166), // orange mid
    path: (s) => encodeAnsi256(s, 43), // blue-green

    /** Add the padding utility function */
    pad: padString,
  };
  return addDynamicFormatting(staticFormatting);
});

/**
 * Create a new formatter with the given settings
 * @param settings The new override values
 * @param base The base formatter to use, will use default formatter if not provided
 * @returns A new formatter with the updated settings
 */
export function createFormatter(
  settings: FormattingOptions,
  base: Formatter = getFormatter()
): Formatter {
  const patched = { ...base, ...settings };
  return addDynamicFormatting(patched);
}

function addDynamicFormatting(target: StaticFormatting): Formatter {
  const { durationUnits, durationValue, packageName, packageScope } = target;
  return Object.assign(target, {
    duration: (duration: number) =>
      formatDuration(duration, durationValue, durationUnits),
    package: (pkg: string) => colorPackage(pkg, packageName, packageScope),
  });
}

/**
 * Format a duration value. This will pick appropriate units (ms, s, m) and format
 * the value to a reasonable number of decimal places.
 *
 * @param duration duration in milliseconds
 * @param colorValue formatting function for the duration value
 * @param colorUnits formatting function for the duration units
 * @returns formatted duration string
 */
export function formatDuration(
  duration: number,
  colorValue: TextTransform = identity,
  colorUnits: TextTransform = identity
): string {
  let unit = "ms";
  if (duration >= 120000) {
    unit = "m";
    duration /= 60000;
  } else if (duration >= 1000) {
    unit = "s";
    duration /= 1000;
  }
  const decimalPlaces = Math.max(
    0,
    2 - Math.floor(Math.log10(duration > 1 ? duration : 1))
  );
  return `${colorValue(duration.toFixed(decimalPlaces))}${colorUnits(unit)}`;
}

/**
 * Color a package name and its scope if present.
 * @param pkg package name to color
 * @param packageName formatting function for the package name
 * @param packageScope formatting function for the package scope
 * @returns colored package name
 */
export function colorPackage(
  pkg: string,
  packageName: TextTransform = identity,
  packageScope: TextTransform = identity
): string {
  if (pkg.startsWith("@")) {
    const parts = pkg.split("/");
    if (parts.length > 1) {
      return `${packageScope(parts[0])}${packageName("/" + parts.splice(0, 1).join("/"))}`;
    }
  }
  return packageName(pkg);
}

/**
 * Pad a string to the specified length, ignoring VT control characters.
 * Defaults to right alignment.
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
