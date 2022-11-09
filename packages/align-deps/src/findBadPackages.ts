import type { PackageManifest } from "@rnx-kit/tools-node/package";
import semverSubset from "semver/ranges/subset";
import banned from "./presets/banned";
import type { ExcludedPackage } from "./types";

function isBanned(name: string, version: string): ExcludedPackage | undefined {
  const info = banned.find((pkg) => pkg.name === name);
  return info && semverSubset(version, info.version) ? info : undefined;
}

export function findBadPackages({
  dependencies,
  peerDependencies,
  devDependencies,
}: PackageManifest): ExcludedPackage[] | undefined {
  const foundBadPackages = [
    dependencies,
    peerDependencies,
    devDependencies,
  ].reduce<Set<ExcludedPackage>>((badPackages, deps) => {
    if (deps) {
      for (const name of Object.keys(deps)) {
        const info = isBanned(name, deps[name]);
        if (info) {
          badPackages.add(info);
        }
      }
    }
    return badPackages;
  }, new Set<ExcludedPackage>());
  return foundBadPackages.size > 0 ? Array.from(foundBadPackages) : undefined;
}
