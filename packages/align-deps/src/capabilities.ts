import type { Capability } from "@rnx-kit/config";
import { warn } from "@rnx-kit/console";
import type { PackageManifest } from "@rnx-kit/tools-node/package";
import { keysOf } from "./helpers";
import type { MetaPackage, Package, Preset, Profile } from "./types";

/**
 * Returns the list of capabilities used in the specified package manifest.
 * @param packageManifest The package manifest to scan for dependencies
 * @param preset The preset to use to resolve capabilities
 * @returns A list of capabilities used in the specified package manifest
 */
export function capabilitiesFor(
  {
    dependencies = {},
    devDependencies = {},
    peerDependencies = {},
  }: PackageManifest,
  preset: Preset
): Capability[] {
  const dependenciesSet = new Set<string>(Object.keys(dependencies));
  Object.keys(peerDependencies).forEach((dep) => dependenciesSet.add(dep));
  Object.keys(devDependencies).forEach((dep) => dependenciesSet.add(dep));

  if (dependenciesSet.size === 0) {
    return [];
  }

  const foundCapabilities = new Set<Capability>();
  for (const profile of Object.values(preset)) {
    for (const capability of keysOf(profile)) {
      const { name } = profile[capability];
      if (dependenciesSet.has(name)) {
        foundCapabilities.add(capability);
      }
    }
  }

  return Array.from(foundCapabilities).sort();
}

export function isMetaPackage(pkg: MetaPackage | Package): pkg is MetaPackage {
  return pkg.name === "#meta" && Array.isArray(pkg.capabilities);
}

function resolveCapability(
  capability: Capability,
  profile: Profile,
  dependencies: Record<string, Package[]>,
  unresolvedCapabilities: Set<string>,
  resolved = new Set<string>()
): void {
  if (resolved.has(capability)) {
    return;
  }

  // Make sure we don't end in a loop
  resolved.add(capability);

  const pkg = profile[capability];
  if (!pkg) {
    unresolvedCapabilities.add(capability);
    return;
  }

  pkg.capabilities?.forEach((capability) =>
    resolveCapability(
      capability,
      profile,
      dependencies,
      unresolvedCapabilities,
      resolved
    )
  );

  if (!isMetaPackage(pkg)) {
    const { name, version } = pkg;
    if (name in dependencies) {
      const versions = dependencies[name];
      if (!versions.find((current) => current.version === version)) {
        versions.push(pkg);
      }
    } else {
      dependencies[name] = [pkg];
    }
  }
}

export function resolveCapabilities(
  capabilities: Capability[],
  profiles: Profile[]
): Record<string, Package[]> {
  const unresolvedCapabilities = new Set<string>();
  const packages = capabilities.reduce<Record<string, Package[]>>(
    (dependencies, capability) => {
      profiles.forEach((profile) => {
        resolveCapability(
          capability,
          profile,
          dependencies,
          unresolvedCapabilities
        );
      });
      return dependencies;
    },
    {}
  );

  if (unresolvedCapabilities.size > 0) {
    const message = Array.from(unresolvedCapabilities).reduce(
      (lines, capability) => (lines += `\n\t${capability}`),
      "The following capabilities could not be resolved for one or more profiles:"
    );

    warn(message);
  }

  return packages;
}
