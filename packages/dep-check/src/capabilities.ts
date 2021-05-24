import type { Capability, KitCapabilities, KitType } from "@rnx-kit/config";
import semver from "semver";
import { getProfileVersionsFor, getProfilesFor } from "./profiles";
import type { Package, PackageManifest, Profile } from "./types";

type CapabilityResolver = (capability: Capability) => Package | undefined;

export function capabilitiesFor(
  { dependencies, devDependencies, peerDependencies }: PackageManifest,
  kitType: KitType = "library"
): Partial<KitCapabilities> | undefined {
  const targetReactNativeVersion =
    peerDependencies?.["react-native"] || dependencies?.["react-native"];
  if (!targetReactNativeVersion) {
    return undefined;
  }

  const profiles = getProfilesFor(targetReactNativeVersion);
  const packageToCapabilityMap: Record<string, Capability[]> = {};
  profiles.forEach((profile) => {
    const capabilityNames = Object.keys(profile) as Capability[];
    capabilityNames.reduce((result, capability) => {
      const { name } = profile[capability];
      if (!result[name]) {
        result[name] = [capability];
      } else {
        result[name].push(capability);
      }
      return result;
    }, packageToCapabilityMap);
  });

  const reactNativeVersion =
    "^" + getProfileVersionsFor(targetReactNativeVersion).join(" || ^");

  return {
    reactNativeVersion,
    ...(kitType === "library"
      ? {
          reactNativeDevVersion:
            devDependencies?.["react-native"] ||
            semver.minVersion(reactNativeVersion)?.version,
        }
      : undefined),
    kitType,
    capabilities: Array.from(
      Object.keys({
        ...dependencies,
        ...peerDependencies,
        ...devDependencies,
      }).reduce<Set<Capability>>((result, dependency) => {
        if (dependency in packageToCapabilityMap) {
          packageToCapabilityMap[dependency].forEach((capability) => {
            result.add(capability);
          });
        }
        return result;
      }, new Set<Capability>())
    ).sort(),
  };
}

function requireCustomResolver(
  resolverPath: string | undefined
): CapabilityResolver | undefined {
  if (resolverPath) {
    const resolver = require(resolverPath);
    if (typeof resolver !== "function") {
      throw new Error(
        `'${resolverPath}' doesn't default export a function with signature '(capability: Capability) => Package'`
      );
    }
    return require(resolverPath) as CapabilityResolver;
  }

  return undefined;
}

export function resolveCapabilities(
  capabilities: Capability[],
  profiles: Profile[],
  customCapabilityResolverPath: string | undefined
): Record<string, Package[]> {
  const unresolvedCapabilities = new Set<string>();

  const defaultResolver = (
    dependencies: Record<string, Package[]>,
    capability: Capability
  ) => {
    profiles.forEach((profile) => {
      const pkg = profile[capability];
      if (!pkg) {
        unresolvedCapabilities.add(capability);
        return;
      }

      const { name, version } = pkg;
      if (name in dependencies) {
        const versions = dependencies[name];
        if (!versions.find((current) => current.version === version)) {
          versions.push(pkg);
        }
      } else {
        dependencies[name] = [pkg];
      }
    });
    return dependencies;
  };

  const customCapabilityResolver = requireCustomResolver(
    customCapabilityResolverPath
  );

  const finalResolver = customCapabilityResolver
    ? (dependencies: Record<string, Package[]>, capability: Capability) => {
        const pkg = customCapabilityResolver(capability);
        if (pkg) {
          dependencies[pkg.name] = [pkg];
          return dependencies;
        }
        return defaultResolver(dependencies, capability);
      }
    : defaultResolver;

  const packages = capabilities.reduce(finalResolver, {});

  if (unresolvedCapabilities.size > 0) {
    const message = Array.from(unresolvedCapabilities).reduce(
      (lines, capability) => (lines += `\n    ${capability}`),
      "The following capabilities could not be resolved for one or more profiles:"
    );

    console.warn(message);
  }

  return packages;
}
