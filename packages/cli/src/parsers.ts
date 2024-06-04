import type { TransformProfile } from "metro-babel-transformer";
import * as path from "path";

export function asBoolean(value: string): boolean {
  switch (value) {
    case "false":
      return false;
    case "true":
      return true;
    default:
      throw new Error(
        "Invalid boolean value '" + value + "' — must be true or false"
      );
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

export function parseTransformProfile(val: string): TransformProfile {
  const allowedProfiles: TransformProfile[] = [
    "hermes-stable",
    "hermes-canary",
    "default",
  ];
  if (val in allowedProfiles) {
    return val as TransformProfile;
  }
  throw new Error(
    "Invalid transform profile '" +
      val +
      "' -- must be one of " +
      allowedProfiles.join(", ")
  );
}
