import type { Capability } from "@rnx-kit/config";
import type { Profile, Package } from "../src/types";

export function pickPackage(profile: Profile, capability: string): Package {
  const pkg = profile[capability];
  if (!pkg) {
    throw new Error(`Could not resolve '${capability}'`);
  } else if (!("version" in pkg)) {
    throw new Error(`'${capability}' is a meta package`);
  }

  return pkg;
}

export function packageVersion(
  profile: Profile,
  capability: Capability
): string {
  return pickPackage(profile, capability).version;
}
