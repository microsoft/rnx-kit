import type { Capability, KitType } from "@rnx-kit/config";
import type { PackageManifest } from "@rnx-kit/tools-node/package";
import omit from "lodash/omit";
import { resolveCapabilities } from "./capabilities";
import { compare, omitEmptySections } from "./helpers";
import type { DependencyType, Package, Preset } from "./types";

function devOnlyPackages(
  packages: Record<string, Package[]>
): Record<string, Package[]> {
  return Object.keys(packages).reduce<Record<string, Package[]>>(
    (result, name) => {
      const versions = packages[name];
      if (versions.some((pkg) => Boolean(pkg.devOnly))) {
        result[name] = versions;
      }
      return result;
    },
    {}
  );
}

export function removeKeys(
  obj: Record<string, string> | undefined,
  keys: string[]
): Record<string, string> | undefined {
  if (!obj) {
    return obj;
  }

  return omit(obj, ...keys);
}

export function updateDependencies(
  dependencies: Record<string, string> = {},
  packages: Record<string, Package[]>,
  dependencyType: DependencyType
): Record<string, string> {
  const packageNames = Object.keys(packages);
  if (packageNames.length === 0) {
    return dependencies;
  }

  const makeVersionRange = (() => {
    switch (dependencyType) {
      case "direct":
        return (versions: Package[]) => versions[versions.length - 1].version;
      case "development":
        return (versions: Package[]) => versions[0].version;
      case "peer":
        return (versions: Package[]) =>
          versions.map((pkg) => pkg.version).join(" || ");
    }
  })();
  const shouldBeAdded = (pkg: Package) =>
    !pkg.devOnly || dependencyType === "development";

  const entries = packageNames.reduce((result, dependency) => {
    const packageRange = packages[dependency];
    if (shouldBeAdded(packageRange[0])) {
      result.push([dependency, makeVersionRange(packageRange)]);
    }
    return result;
  }, Object.entries(dependencies));
  return Object.fromEntries(entries.sort(([a], [b]) => compare(a, b)));
}

/**
 * Updates the specified package manifest so that it will satisfy all declared
 * capabilities, using the specified preset.
 *
 * When a kit is of type "library", it expects the consumer to be providing all
 * the capabilites. This function will make sure that `peerDependencies` is
 * correctly populated, and because `peerDependencies` don't get downloaded (at
 * least with some package managers), it will also make sure that appropriate
 * changes are made to `devDependencies`. To avoid version conflicts with the
 * hosting app, and with other libraries, the packages that were added, will be
 * removed from `dependencies` if found.
 *
 * This function behaves similarly when a kit is of type "app". But because it
 * is now a provider of capabilities, it needs to have a direct dependency on
 * packages. For the "app" type, packages are instead added to `dependencies`,
 * and removed from `peerDependencies` and `devDependencies`.
 *
 * @param manifestPath The path to the package manifest to update
 * @param manifest The package manifest to update
 * @param capabilities The set of capabilities that the kit requires
 * @param prodPreset The preset that the kit needs to conform to
 * @param devPreset The preset that the kit will develop against
 * @param packageType Whether the kit provides a feature or is an app
 * @returns A package manifest that satisfies specified capabilities
 */
export function updatePackageManifest(
  manifestPath: string,
  manifest: PackageManifest,
  capabilities: Capability[],
  prodPreset: Preset,
  devPreset: Preset,
  packageType: KitType
): PackageManifest {
  const { dependencies, peerDependencies, devDependencies } = manifest;
  const packages = resolveCapabilities(manifestPath, capabilities, prodPreset);
  const names = Object.keys(packages);

  switch (packageType) {
    case "app":
      return omitEmptySections({
        ...manifest,
        dependencies: updateDependencies(dependencies, packages, "direct"),
        peerDependencies: removeKeys(peerDependencies, names),
        devDependencies: updateDependencies(
          removeKeys(devDependencies, names),
          devOnlyPackages(packages),
          "development"
        ),
      });
    case "library":
      return omitEmptySections({
        ...manifest,
        dependencies: removeKeys(dependencies, names),
        peerDependencies: updateDependencies(
          peerDependencies,
          packages,
          "peer"
        ),
        devDependencies: updateDependencies(
          devDependencies,
          resolveCapabilities(manifestPath, capabilities, devPreset),
          "development"
        ),
      });
  }
}
