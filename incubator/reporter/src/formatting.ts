import { stripVTControlCharacters } from "node:util";
import type {
  ColorSettings,
  DeepPartial,
  FormatHelper,
  ReporterSettings,
} from "./types.ts";

export function noChange<T>(arg: T) {
  return arg;
}

function asObject<T extends object>(item: unknown): T | undefined {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    return item as T;
  }
  return undefined;
}

/**
 * Deep merges two objects, applying the source object properties to the target object.
 * @param target the object to merge into
 * @param source the object to merge from
 * @param immutable if true, the target object will not be modified, instead a new object will be returned
 * @returns either target with applied updates (if !immutable) or a new object with the merged settings
 */
export function mergeSettings<T extends object>(
  target: T,
  source?: DeepPartial<T>,
  immutable?: boolean
): T {
  if (!source) {
    return target;
  }
  if (immutable) {
    target = { ...target };
  }
  for (const key in source) {
    if (source[key] !== undefined) {
      const objValue = asObject(source[key]);
      const objTarget = asObject(target[key]);
      if (objValue && objTarget) {
        target[key] = mergeSettings(
          objTarget,
          objValue,
          immutable
        ) as T[Extract<keyof T, string>];
      } else {
        target[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }
  return target;
}

const emptyMsgColors = { text: stripVTControlCharacters };

export const disableColorOptions: DeepPartial<ReporterSettings> = {
  inspectOptions: { colors: false },
  color: {
    message: {
      default: emptyMsgColors,
      error: emptyMsgColors,
      warn: emptyMsgColors,
      log: emptyMsgColors,
      verbose: emptyMsgColors,
    },
  },
};

export function createFormatHelper(colorSettings: ColorSettings): FormatHelper {
  const { path: colorPath } = colorSettings;
  return {
    packageFull: (pkg: string) => formatPackageName(colorSettings, pkg),
    packageParts: (name: string, scope?: string) =>
      formatPackageParts(colorSettings, name, scope),
    path: (pathValue: string) => colorPath(pathValue),
    duration: (time: number) => formatDuration(colorSettings, time),
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
