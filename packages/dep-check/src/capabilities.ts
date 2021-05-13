import type { Capability, KitCapabilities, KitType } from "@rnx-kit/config";
import semver from "semver";
import { getProfileVersionsFor, getProfilesFor } from "./profiles";
import type { Package, PackageManifest, Profile } from "./types";

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

export function resolveCapabilities(
  capabilities: Capability[],
  profiles: Profile[]
): Record<string, Package[]> {
  const unresolvedCapabilities: string[] = [];
  const packages = capabilities.reduce<Record<string, Package[]>>(
    (dependencies, capability) => {
      profiles.forEach((profile) => {
        const pkg = profile[capability];
        if (!pkg) {
          unresolvedCapabilities.push(capability);
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
    },
    {}
  );

  if (unresolvedCapabilities.length > 0) {
    const message = unresolvedCapabilities.reduce(
      (lines, capability) => (lines += `\n    ${capability}`),
      "The following capabilities could not be resolved for one or more profiles:"
    );

    console.warn(message);
  }

  return packages;
}
