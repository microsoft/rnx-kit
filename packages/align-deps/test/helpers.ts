import type { Capability } from "@rnx-kit/config";
import { createRequire } from "node:module";
import { URL } from "node:url";
import type { Package, Profile } from "../src/types";

export function defineRequire(path: string, base: string | URL) {
  global.require = createRequire(new URL(path, base));
}

export function undefineRequire() {
  global.require = undefined;
}

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
