import type { PackageManifest } from "@rnx-kit/tools-node/package";
import semverSubset from "semver/ranges/subset";
import { bannedPackages } from "./presets/banned";
import type { ExcludedPackage } from "./types";

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
