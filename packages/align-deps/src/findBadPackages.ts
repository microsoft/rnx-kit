import type { PackageManifest } from "@rnx-kit/core-types";
import semverSubset from "semver/ranges/subset.js";
import { bannedPackages } from "./presets/banned.ts";
import type { ExcludedPackage } from "./types.ts";

function isBanned(name: string, version: string): ExcludedPackage | undefined {
  const info = bannedPackages.find((pkg) => pkg.name === name);
  return info && semverSubset(version, info.version) ? info : undefined;
}

export function findBadPackages({
  dependencies,
  peerDependencies,
  devDependencies,
}: PackageManifest): ExcludedPackage[] | undefined {
  const badPackages = new Set<ExcludedPackage>();
  for (const deps of [dependencies, peerDependencies, devDependencies]) {
    if (deps) {
      for (const name of Object.keys(deps)) {
        const info = isBanned(name, deps[name]);
        if (info) {
          badPackages.add(info);
        }
      }
    }
  }
  return badPackages.size > 0 ? Array.from(badPackages) : undefined;
}
