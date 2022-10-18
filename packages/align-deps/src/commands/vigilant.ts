import type { Capability } from "@rnx-kit/config";
import { error } from "@rnx-kit/console";
import type { PackageManifest } from "@rnx-kit/tools-node/package";
import * as path from "path";
import semverSubset from "semver/ranges/subset";
import { resolveCapabilities } from "../capabilities";
import { keysOf, modifyManifest } from "../helpers";
import { updateDependencies } from "../manifest";
import { filterPreset, mergePresets } from "../preset";
import type {
  AlignDepsConfig,
  ErrorCode,
  ManifestProfile,
  Options,
  Preset,
} from "../types";

type Change = {
  name: string;
  from: string;
  to: string;
  section: string;
};

const allSections = [
  "dependencies" as const,
  "peerDependencies" as const,
  "devDependencies" as const,
];

function getAllCapabilities(preset: Preset): Capability[] {
  const capabilities = new Set<Capability>();
  for (const profile of Object.values(preset)) {
    for (const capability of keysOf(profile)) {
      capabilities.add(capability);
    }
  }

  return Array.from(capabilities);
}

function isMisalignedDirect(from: string, to: string): boolean {
  return from !== to;
}

function isMisalignedPeer(from: string, to: string): boolean {
  return from !== to && !semverSubset(to, from, { includePrerelease: true });
}

/**
 * Builds a package manifest containing _all_ capabilities from profiles that
 * satisfy the specified requirements.
 * @returns A package manifest containing all capabilities
 */
export function buildManifestProfile(
  manifestPath: string,
  { kitType, alignDeps }: AlignDepsConfig
): ManifestProfile {
  const mergedPresets = mergePresets(
    alignDeps.presets,
    path.dirname(manifestPath)
  );

  const [targetPreset, supportPreset] = (() => {
    const { requirements } = alignDeps;
    if (Array.isArray(requirements)) {
      const preset = filterPreset(requirements, mergedPresets);
      return [preset, preset];
    }

    const prodPreset = filterPreset(requirements.production, mergedPresets);
    return kitType === "app"
      ? [prodPreset, prodPreset]
      : [filterPreset(requirements.development, mergedPresets), prodPreset];
  })();

  const unmanagedCapabilities = getAllCapabilities(targetPreset).filter(
    (capability) => !alignDeps.capabilities.includes(capability)
  );

  // Use "development" type so we can check for `devOnly` packages under
  // `dependencies` as well.
  const directDependencies = updateDependencies(
    {},
    resolveCapabilities(unmanagedCapabilities, Object.values(targetPreset)),
    "development"
  );

  const peerDependencies = updateDependencies(
    {},
    resolveCapabilities(unmanagedCapabilities, Object.values(supportPreset)),
    "peer"
  );

  return {
    name: "@rnx-kit/align-deps/vigilant-preset",
    version: "1.0.0",
    dependencies: directDependencies,
    peerDependencies,
    devDependencies: directDependencies,
  };
}

/**
 * Compares the package manifest with the desired profile and returns all
 * dependencies that are misaligned.
 * @param manifest The package manifest
 * @param profile The desired profile to compare against
 * @param write Whether misaligned dependencies should be updated
 * @returns A list of misaligned dependencies
 */
export function inspect(
  manifest: PackageManifest,
  profile: ManifestProfile,
  write: boolean
): Change[] {
  const changes: Change[] = [];
  allSections.forEach((section) => {
    const dependencies = manifest[section];
    if (!dependencies) {
      return;
    }

    const isMisaligned =
      section === "peerDependencies" ? isMisalignedPeer : isMisalignedDirect;
    const desiredDependencies = profile[section];
    Object.keys(dependencies).forEach((name) => {
      if (name in desiredDependencies) {
        const from = dependencies[name];
        const to = desiredDependencies[name];
        if (isMisaligned(from, to)) {
          changes.push({ name, from, to, section });
          if (write) {
            dependencies[name] = to;
          }
        }
      }
    });
  });
  return changes;
}

/**
 * Checks the specified package manifest for misaligned dependencies in place.
 * Because the package is not configured, `align-deps` cannot know whether a
 * dependency should be declared as a direct or peer dependency. It can only
 * check whether the dependency is on the right version.
 * @param manifestPath The path to the package manifest
 * @param options Options from command line
 * @param config Configuration from `package.json` or "generated" from command line flags
 * @returns Whether the package needs changes
 */
export function checkPackageManifestUnconfigured(
  manifestPath: string,
  { excludePackages, write }: Options,
  config: AlignDepsConfig
): ErrorCode {
  if (excludePackages?.includes(config.manifest.name)) {
    return "success";
  }

  const manifestProfile = buildManifestProfile(manifestPath, config);
  const { manifest } = config;
  const changes = inspect(manifest, manifestProfile, write);
  if (changes.length > 0) {
    if (write) {
      modifyManifest(manifestPath, manifest);
    } else {
      const violations = changes
        .map(
          ({ name, from, to, section }) =>
            `\t${name} "${from}" -> "${to}" (${section})`
        )
        .join("\n");
      error(
        `Found ${changes.length} violation(s) in ${manifest.name}:\n${violations}`
      );
      return "unsatisfied";
    }
  }

  return "success";
}
