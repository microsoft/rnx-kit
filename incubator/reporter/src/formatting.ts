import chalk from "chalk";
import {
  inspect,
  type InspectOptions,
  stripVTControlCharacters,
} from "node:util";
import { allLogLevels } from "./levels.ts";
import type {
  ColorSettings,
  DeepPartial,
  FormatHelper,
  FormattingOptions,
  FormattingSettings,
} from "./types.ts";

export function noChange<T>(arg: T) {
  return arg;
}

export type Formatting = FormattingSettings & {
  format: FormatHelper;
};

const defaultFormatSettings: FormattingSettings = {
  inspectOptions: {
    colors: true,
    depth: 2,
    compact: true,
  },
  colors: {
    error: { prefix: chalk.red.bold },
    warn: { prefix: chalk.yellowBright.bold },
    log: {},
    verbose: { text: chalk.dim },
    labels: chalk.bold,
    pkgName: chalk.bold.cyan,
    pkgScope: chalk.bold.blue,
    path: chalk.blue,
    duration: chalk.green,
    durationUnits: chalk.greenBright,
  },
  prefixes: {
    error: "ERROR: ⛔",
    warn: "WARNING: ⚠️",
  },
};

const defaultFormatting: Formatting = {
  ...defaultFormatSettings,
  format: createFormatHelper(defaultFormatSettings),
};

export function getFormatting(
  overrides?: FormattingOptions,
  baseline: Formatting = defaultFormatting
): Formatting {
  if (overrides) {
    const { colors, inspectOptions, prefixes } = overrides;
    const rebuildFormat = colors || inspectOptions;

    // if settings have changed, create a new formatting object
    if (rebuildFormat || prefixes) {
      const result = {
        colors: mergeColors(baseline.colors, colors),
        inspectOptions: mergeInspectOptions(
          baseline.inspectOptions,
          inspectOptions
        ),
        prefixes: mergePrefixes(baseline.prefixes, prefixes),
        format: baseline.format,
      };
      // update the format helper if needed, otherwise carry it forward
      if (rebuildFormat) {
        result.format = createFormatHelper(result);
      }
      return result;
    }
  }
  return baseline;
}

export function updateDefaultFormatting(options?: FormattingOptions) {
  const newDefault = getFormatting(options);
  if (newDefault !== defaultFormatting) {
    defaultFormatting.colors = newDefault.colors;
    defaultFormatting.inspectOptions = newDefault.inspectOptions;
    defaultFormatting.prefixes = newDefault.prefixes;
    defaultFormatting.format = newDefault.format;
  }
}

export function disableColors() {
  const disableMsgType = { text: stripVTControlCharacters };
  updateDefaultFormatting({
    inspectOptions: { colors: false },
    colors: {
      error: disableMsgType,
      warn: disableMsgType,
      log: disableMsgType,
      verbose: disableMsgType,
    },
  });
}

export function defaultColors(): Readonly<ColorSettings> {
  return defaultFormatting.colors;
}

export function defaultFormat(): Readonly<FormatHelper> {
  return defaultFormatting.format;
}

function mergePrefixes(
  base: FormattingSettings["prefixes"],
  override?: Partial<FormattingSettings["prefixes"]>
) {
  return override ? { ...base, ...override } : base;
}

function mergeInspectOptions(
  base: InspectOptions,
  overrides?: Partial<InspectOptions>
): InspectOptions {
  return overrides ? { ...base, ...overrides } : base;
}

function mergeColors(
  base: ColorSettings,
  overrides?: DeepPartial<ColorSettings>
): ColorSettings {
  if (overrides) {
    const result = { ...base, ...overrides };
    for (const level of allLogLevels) {
      if (overrides[level]) {
        result[level] = { ...base[level], ...overrides[level] };
      }
    }
  }
  return base;
}

export function createFormatHelper(settings: FormattingSettings): FormatHelper {
  const { colors, inspectOptions } = settings;
  return {
    packageFull: (pkg: string) => formatPackageName(colors, pkg),
    packageParts: (name: string, scope?: string) =>
      formatPackageParts(colors, name, scope),
    path: (pathValue: string) => colors.path(pathValue),
    duration: (time: number) => formatDuration(colors, time),
    serialize: (args: unknown[]) => serializeArgs(inspectOptions, args),
  };
}

/**
 * Parse a duration in milliseconds and formatting it to a string suitable for display
 * @param duration duration in milliseconds
 * @returns an tuple of the formatted numeric string and the unit (seconds or milliseconds)
 */
export function formatDuration(
  colors: ColorSettings,
  duration: number,
  secondToMinuteCutoff = 120
): string {
  const {
    duration: colorTime = noChange,
    durationUnits: timeUnits = noChange,
  } = colors;
  let unit = "ms";
  if (duration > secondToMinuteCutoff * 1000) {
    unit = "m";
    duration /= 60000;
  } else if (duration > 1000) {
    unit = "s";
    duration /= 1000;
  }
  const decimalPlaces = Math.max(0, 2 - Math.floor(Math.log10(duration)));
  return `${colorTime(duration.toFixed(decimalPlaces))}${timeUnits(unit)}`;
}

function formatPackageName(colors: ColorSettings, moduleName: string) {
  if (moduleName.startsWith("@")) {
    const parts = moduleName.split("/");
    if (parts.length > 1) {
      return formatPackageParts(colors, parts.slice(1).join("/"), parts[0]);
    }
  }
  return formatPackageParts(colors, moduleName);
}

function formatPackageParts(
  colors: ColorSettings,
  name: string,
  scope?: string
) {
  const { pkgName = noChange, pkgScope = noChange } = colors;
  return scope ? `${pkgScope(scope)}/${pkgName(name)}` : pkgName(name);
}

/**
 * @param inspectOptions options for node:util.inspect, used to format the arguments, same as console.log
 * @param args args list to serialize
 * @returns a single string with arguments joined together with spaces, terminated with a newline
 */
export function serializeArgs(
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
