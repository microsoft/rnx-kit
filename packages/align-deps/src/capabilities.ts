import { warn } from "@rnx-kit/console";
import { keysOf } from "@rnx-kit/tools-language/properties";
import type { Capability } from "@rnx-kit/types-kit-config";
import type { PackageManifest } from "@rnx-kit/types-node";
import type { MetaPackage, Package, Preset, Profile } from "./types.ts";

type ResolvedDependencies = {
  dependencies: Record<string, Package[]>;
  unresolvedCapabilities: Record<string, string[]>;
};

type CapabilityVisitor = (pkg: Readonly<Package>, declared: Capability) => void;

const PROVIDES_SYMKEY = "provides";

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
  for (const dep in peerDependencies) {
    dependenciesSet.add(dep);
  }
  for (const dep in devDependencies) {
    dependenciesSet.add(dep);
  }

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

export function capabilityProvidedBy(
  pkg: MetaPackage | Package
): string | undefined {
  return pkg[Symbol.for(PROVIDES_SYMKEY)];
}

export function isMetaPackage(pkg: MetaPackage | Package): pkg is MetaPackage {
  return pkg.name === "#meta" && Array.isArray(pkg.capabilities);
}

function resolveCapability(
  capability: Capability,
  namedProfile: [string, Profile],
  dependencies: Record<string, Package[]>,
  unresolvedCapabilities: Record<string, string[]>,
  packages: Map<MetaPackage | Package, MetaPackage | Package>,
  declared: Capability,
  onResolved?: CapabilityVisitor,
  /** @internal */ resolved = new Set<string>([
    "__proto__",
    "constructor",
    "prototype",
  ])
): void {
  if (resolved.has(capability)) {
    return;
  }

  // Make sure we don't end in a loop
  resolved.add(capability);

  const [profileName, profile] = namedProfile;
  const original = profile[capability];
  if (!original) {
    const profiles = unresolvedCapabilities[capability];
    if (!profiles) {
      unresolvedCapabilities[capability] = [profileName];
    } else {
      profiles.push(profileName);
    }
    return;
  }

  let pkg = packages.get(original);
  if (!pkg) {
    pkg = { ...original };
    packages.set(original, pkg);
  }
  pkg[Symbol.for(PROVIDES_SYMKEY)] = capability;

  if (pkg.capabilities) {
    for (const capability of pkg.capabilities) {
      resolveCapability(
        capability,
        namedProfile,
        dependencies,
        unresolvedCapabilities,
        packages,
        declared,
        onResolved,
        resolved
      );
    }
  }

  if (!isMetaPackage(pkg)) {
    const { name, version } = pkg;
    if (!name) {
      throw new Error(`Invalid capability '${capability}': missing name`);
    }
    if (!version) {
      throw new Error(`Invalid capability '${capability}': missing version`);
    }

    onResolved?.(pkg, declared);
    if (Object.hasOwn(dependencies, name)) {
      const versions = dependencies[name];
      if (!versions.find((current) => current.version === version)) {
        versions.push(pkg);
      }
    } else {
      Object.defineProperty(dependencies, name, {
        value: [pkg],
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
}

/**
 * Resolves specified capabilities to real dependencies.
 * @param capabilities The list of capabilities to resolve
 * @param preset The preset to use to resolve capabilities
 * @param onResolved Optional visitor retaining the declared capability's provenance
 * @returns A tuple of resolved dependencies and unresolved capabilities
 */
export function resolveCapabilitiesUnchecked(
  capabilities: Capability[],
  preset: Preset,
  onResolved?: CapabilityVisitor
): ResolvedDependencies {
  const profiles = Object.entries(preset);
  const dependencies: Record<string, Package[]> = {};
  const unresolvedCapabilities: Record<string, string[]> = {};
  const packages = new Map<MetaPackage | Package, MetaPackage | Package>();

  for (const capability of capabilities) {
    for (const profile of profiles) {
      resolveCapability(
        capability,
        profile,
        dependencies,
        unresolvedCapabilities,
        packages,
        capability,
        onResolved
      );
    }
  }

  return { dependencies, unresolvedCapabilities };
}

/**
 * Resolves specified capabilities to real dependencies.
 *
 * Same as {@link resolveCapabilitiesUnchecked}, but warns about any unresolved
 * capabilities.
 *
 * @param manifestPath The path to the package manifest
 * @param capabilities The list of capabilities to resolve
 * @param preset The preset to use to resolve capabilities
 * @returns Resolved dependencies
 */
export function resolveCapabilities(
  manifestPath: string,
  capabilities: Capability[],
  preset: Preset
): Record<string, Package[]> {
  const { dependencies, unresolvedCapabilities } = resolveCapabilitiesUnchecked(
    capabilities,
    preset
  );

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
