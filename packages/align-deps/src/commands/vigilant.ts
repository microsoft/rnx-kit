import type { Capability } from "@rnx-kit/config";
import { error, info, warn } from "@rnx-kit/console";
import { keysOf } from "@rnx-kit/tools-language/properties";
import type { PackageManifest } from "@rnx-kit/tools-node/package";
import * as path from "path";
import semverSubset from "semver/ranges/subset";
import {
  capabilityProvidedBy,
  resolveCapabilities,
  resolveCapabilitiesUnchecked,
} from "../capabilities";
import { stringify } from "../diff";
import { modifyManifest } from "../helpers";
import { updateDependencies } from "../manifest";
import { ensurePreset, filterPreset, mergePresets } from "../preset";
import type {
  AlignDepsConfig,
  Changes,
  ErrorCode,
  ManifestProfile,
  Options,
  Package,
  Preset,
} from "../types";

type Report = {
  changes: Changes;
  changesCount: number;
  unmanagedDependencies: [string, string][];
};

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
 * Similar to {@link resolveCapabilities}, but filters out dependencies that
 * have already been checked.
 * @param manifestPath Path to the package manifest
 * @param allCapabilities All capabilities that need to be checked
 * @param preset The preset used to resolve capabilities
 * @param managedDependencies Dependencies that have already been checked
 * @returns Dependencies that still need to be checked.
 */
function resolveUnmanagedCapabilities(
  manifestPath: string,
  allCapabilities: Capability[],
  preset: Preset,
  managedDependencies: string[]
): Record<string, Package[]> {
  const dependencies = resolveCapabilities(
    manifestPath,
    allCapabilities,
    preset
  );
  for (const name of managedDependencies) {
    delete dependencies[name];
  }
  return dependencies;
}

/**
 * Builds a package manifest containing _all_ capabilities from profiles that
 * satisfy the specified requirements.
 * @param manifestPath The path to the package manifest
 * @param config Configuration from `package.json` or "generated" from command line flags
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
      const preset = filterPreset(mergedPresets, requirements);
      ensurePreset(preset, requirements);
      return [preset, preset];
    }

    const prodPreset = filterPreset(mergedPresets, requirements.production);
    ensurePreset(prodPreset, requirements.production);

    if (kitType === "app") {
      return [prodPreset, prodPreset];
    }

    const devPreset = filterPreset(mergedPresets, requirements.development);
    ensurePreset(devPreset, requirements.development);

    return [devPreset, prodPreset];
  })();

  // Multiple capabilities may resolve to the same dependency. We must therefore
  // resolve them first before we can filter out checked dependencies.
  const managedDependencies = Object.keys(
    resolveCapabilitiesUnchecked(alignDeps.capabilities, targetPreset)
      .dependencies
  );

  const allCapabilities = getAllCapabilities(supportPreset);

  // Use "development" type so we can check for `devOnly` packages under
  // `dependencies` as well.
  const unmanagedCapabilities = resolveUnmanagedCapabilities(
    manifestPath,
    allCapabilities,
    targetPreset,
    managedDependencies
  );

  const directDependencies = updateDependencies(
    {},
    unmanagedCapabilities,
    "development"
  );

  const peerDependencies = updateDependencies(
    {},
    resolveUnmanagedCapabilities(
      manifestPath,
      allCapabilities,
      supportPreset,
      managedDependencies
    ),
    "peer"
  );

  return {
    dependencies: directDependencies,
    peerDependencies,
    devDependencies: directDependencies,
    unmanagedCapabilities: Object.fromEntries(
      Object.values(unmanagedCapabilities).map((packages) => {
        const pkg = packages[0];
        return [pkg.name, capabilityProvidedBy(pkg)];
      })
    ),
  };
}

/**
 * Cached version of {@link buildManifestProfile}.
 *
 * In monorepositories with many packages, this can save a lot of time.
 *
 * @param manifestPath The path to the package manifest
 * @param config Configuration from `package.json` or "generated" from command line flags
 * @returns A package manifest containing all capabilities
 */
const buildManifestProfileCached = ((): typeof buildManifestProfile => {
  const profileCache: Record<string, ManifestProfile> = {};
  return (manifestPath, config) => {
    const { kitType, alignDeps } = config;
    const key = `${kitType}:${JSON.stringify(alignDeps)}`;
    if (!profileCache[key]) {
      const result = buildManifestProfile(manifestPath, config);
      profileCache[key] = result;
    }

    return profileCache[key];
  };
})();

/**
 * Compares the package manifest with the desired profile and returns all
 * dependencies that are misaligned.
 *
 * Note that this function mutates the manifest when `write` is `true`.
 *
 * @param manifest The package manifest
 * @param profile The desired profile to compare against
 * @param write Whether misaligned dependencies should be updated
 * @returns A list of misaligned dependencies
 */
export function inspect(
  manifest: PackageManifest,
  profile: ManifestProfile,
  write: boolean
): Report {
  const allChanges: Report["changes"] = {
    dependencies: [],
    peerDependencies: [],
    devDependencies: [],
  };
  const capabilities: Record<string, string> = {};

  const { unmanagedCapabilities } = profile;

  const changesCount = keysOf(allChanges).reduce((count, section) => {
    const dependencies = manifest[section];
    if (!dependencies) {
      return count;
    }

    const isMisaligned =
      section === "peerDependencies" ? isMisalignedPeer : isMisalignedDirect;
    const desiredDependencies = profile[section];
    const changes = allChanges[section];

    for (const name of Object.keys(dependencies)) {
      if (name in desiredDependencies) {
        const from = dependencies[name];
        const to = desiredDependencies[name];
        if (isMisaligned(from, to)) {
          changes.push({
            type: "changed",
            dependency: name,
            target: to,
            current: from,
          });
          if (write) {
            dependencies[name] = to;
          }
        }

        const capability = unmanagedCapabilities[name];
        if (capability) {
          capabilities[name] = capability;
        }
      }
    }

    return count + changes.length;
  }, 0);

  return {
    changes: allChanges,
    changesCount,
    unmanagedDependencies: Object.entries(capabilities),
  };
}

/**
 * Checks the specified package manifest for misaligned dependencies in place.
 *
 * Because the package is not configured, `align-deps` cannot know whether a
 * dependency should be declared as a direct or peer dependency. It can only
 * check whether the dependency is on the right version.
 *
 * @param manifestPath The path to the package manifest
 * @param options Options from command line
 * @param config Configuration from `package.json` or "generated" from command line flags
 * @param logError Function for outputting changes
 * @returns Whether the package needs changes
 */
export function checkPackageManifestUnconfigured(
  manifestPath: string,
  { excludePackages, write }: Options,
  config: AlignDepsConfig,
  logError = error
): ErrorCode {
  if (excludePackages?.includes(config.manifest.name)) {
    return "success";
  }

  const manifestProfile = buildManifestProfileCached(manifestPath, config);
  const { manifest } = config;
  const { changes, changesCount, unmanagedDependencies } = inspect(
    manifest,
    manifestProfile,
    write
  );

  if (
    config.alignDeps.capabilities.length > 0 &&
    unmanagedDependencies.length > 0
  ) {
    const dependencies = unmanagedDependencies
      .map(([name, capability]) => {
        return `\t  - ${name} can be managed by '${capability}'`;
      })
      .join("\n");
    warn(
      `${manifestPath}: Found dependencies that are currently missing from capabilities:\n${dependencies}`
    );
    info(
      "Note: Capabilities will never be added automatically, even with '--write'."
    );
  }

  if (changesCount > 0) {
    if (write) {
      modifyManifest(manifestPath, manifest);
    } else {
      const violations = stringify(changes, [
        `${manifestPath}: Found ${changesCount} violation(s) outside of capabilities.`,
      ]);
      logError(violations);
      return "unsatisfied";
    }
  }

  return "success";
}
