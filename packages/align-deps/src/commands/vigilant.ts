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

function isMisalignedDirect(from: string, to: string): boolean {
  return from !== to;
}

function isMisalignedPeer(from: string, to: string): boolean {
  return from !== to && !semverSubset(to, from, { includePrerelease: true });
}

/**
 * Builds a profile targeting specified versions.
 * @returns A profile containing dependencies to compare against
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

  const allCapabilities = targetPreset[keysOf(targetPreset)[0]];
  const unmanagedCapabilities = keysOf(allCapabilities).filter(
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

  const { name, version } = require("../../package.json");
  return {
    name,
    version,
    dependencies: directDependencies,
    peerDependencies,
    devDependencies: directDependencies,
  };
}

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
