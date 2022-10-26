import type { Capability } from "@rnx-kit/config";
import { warn } from "@rnx-kit/console";
import { keysOf } from "@rnx-kit/tools-language/properties";
import type { PackageManifest } from "@rnx-kit/tools-node/package";
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
  namedProfile: [string, Profile],
  dependencies: Record<string, Package[]>,
  unresolvedCapabilities: Record<string, string[]>,
  resolved = new Set<string>()
): void {
  if (resolved.has(capability)) {
    return;
  }

  // Make sure we don't end in a loop
  resolved.add(capability);

  const [profileName, profile] = namedProfile;
  const pkg = profile[capability];
  if (!pkg) {
    const profiles = unresolvedCapabilities[capability];
    if (!profiles) {
      unresolvedCapabilities[capability] = [profileName];
    } else {
      profiles.push(profileName);
    }
    return;
  }

  pkg.capabilities?.forEach((capability) =>
    resolveCapability(
      capability,
      namedProfile,
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
  manifestPath: string,
  capabilities: Capability[],
  preset: Preset
): Record<string, Package[]> {
  const profiles = Object.entries(preset);
  const dependencies: Record<string, Package[]> = {};
  const unresolvedCapabilities: Record<string, string[]> = {};

  for (const capability of capabilities) {
    profiles.forEach((profile) => {
      resolveCapability(
        capability,
        profile,
        dependencies,
        unresolvedCapabilities
      );
    });
  }

  const unresolved = Object.entries(unresolvedCapabilities);
  if (unresolved.length > 0) {
    const message = unresolved.reduce(
      (lines, [capability, profiles]) =>
        (lines += `\n\t${capability} (missing in ${profiles.join(", ")})`),
      `${manifestPath}: The following capabilities could not be resolved for one or more profiles:`
    );

    warn(message);
  }

  return dependencies;
}
