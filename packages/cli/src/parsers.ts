import type { TransformProfile } from "metro-babel-transformer";

export function parseBoolean(val: string): boolean {
  if (val === "false") {
    return false;
  }
  if (val === "true") {
    return true;
  }
  throw new Error(
    "Invalid boolean value '" + val + "' -- must be true or false"
  );
}

export function parseInt(value: string): number {
  return global.parseInt(value, 10);
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
