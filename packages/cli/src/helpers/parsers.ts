import type { EventFrequency } from "@rnx-kit/tools-performance";
import { InvalidArgumentError } from "commander";
import type { TransformProfile } from "metro-babel-transformer";
import * as path from "node:path";

export function asBoolean(value: string): boolean {
  switch (value) {
    case "false":
      return false;
    case "true":
      return true;
    default:
      throw new InvalidArgumentError(`Expected 'true' or 'false'.`);
  }
}

export function asNumber(value: string): number {
  return Number(value);
}

export function asResolvedPath(value: string): string {
  return path.resolve(value);
}

export function asStringArray(value: string): string[] {
  return value.split(",");
}

export function asEnum<T extends string>(value: string, options: T[]): T {
  if (options.includes(value as T)) {
    return value as T;
  }

  throw new InvalidArgumentError(`Expected '${options.join("', '")}'.`);
}

export function asTransformProfile(val: string): TransformProfile {
  const TRANSFORM_PROFILES: TransformProfile[] = [
    "hermes-stable",
    "hermes-canary",
    "default",
  ];
  return asEnum(val, TRANSFORM_PROFILES);
}

export function asFrequency(value: string): EventFrequency {
  const FREQUENCIES: EventFrequency[] = ["low", "medium", "high"];
  return asEnum(value, FREQUENCIES);
}
