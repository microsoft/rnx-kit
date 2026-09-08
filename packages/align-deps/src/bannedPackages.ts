import type { Capability } from "@rnx-kit/types-kit-config";
import type { PackageManifest } from "@rnx-kit/types-node";
import semverSubset from "semver/ranges/subset.js";
import { bannedPackages } from "./presets/banned.ts";
import type { ExcludedPackage } from "./types.ts";

export function isBanned(
  name: string,
  version: string
): ExcludedPackage | undefined {
  const info = bannedPackages[name];
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
      for (const name in deps) {
        const info = isBanned(name, deps[name]);
        if (info) {
          badPackages.add(info);
        }
      }
    }
  }
  return badPackages.size > 0 ? Array.from(badPackages) : undefined;
}

/**
 * Resolves the set of stale/renamed package names that should be removed for
 * the specified capabilities.
 *
 * A banned package is only returned when the capability that supersedes it is
 * currently being managed (i.e. it is in `capabilities`). For example,
 * `@react-native-community/async-storage` was renamed to
 * `@react-native-async-storage/async-storage`, which is provided by the
 * `storage` capability; the old package is therefore only removed when
 * `storage` is a declared capability.
 *
 * This ensures we never remove a package that the consumer isn't managing via
 * `align-deps`. The capabilities do not change between dependency sections, so
 * this only needs to be resolved once per manifest.
 *
 * Note that a capability may currently still resolve to a banned package (e.g.
 * `babel-preset-react-native` → `metro-react-native-babel-preset` in
 * react-native 0.71/0.72). Such packages are safely re-added by
 * {@link updateDependencies} after removal, so they don't need special casing
 * here.
 *
 * @param capabilities The capabilities currently being managed
 * @returns The names of the stale packages that should be removed. Note the
 * list may include packages that a managed capability still resolves to. Such
 * packages are removed, then re-added by {@link updateDependencies}. Callers
 * must not treat this list as "packages to remove permanently".
 */
export function resolveBannedPackages(
  capabilities: readonly Capability[]
): string[] {
  const managed = new Set(capabilities);
  const stale: string[] = [];
  for (const name in bannedPackages) {
    const { capability } = bannedPackages[name];
    if (capability && managed.has(capability)) {
      stale.push(name);
    }
  }
  return stale;
}
