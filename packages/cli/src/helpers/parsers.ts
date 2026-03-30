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

export function asTransformProfile(val: string): TransformProfile {
  switch (val) {
    case "hermes-stable":
    case "hermes-canary":
    case "default":
      return val;

    default: {
      const profiles: TransformProfile[] = [
        "hermes-stable",
        "hermes-canary",
        "default",
      ];
      throw new InvalidArgumentError(`Expected '${profiles.join("', '")}'.`);
    }
  }
}
