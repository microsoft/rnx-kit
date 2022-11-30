import { Capability } from "@rnx-kit/config";
import { error } from "@rnx-kit/console";
import { PackageManifest, readPackage } from "@rnx-kit/tools-node/package";
import isString from "lodash/isString";
import semverSubset from "semver/ranges/subset";
import { resolveCapabilities } from "./capabilities";
import { checkPackageManifest, getCheckConfig } from "./check";
import { keysOf, modifyManifest } from "./helpers";
import { updateDependencies } from "./manifest";
import { parseProfilesString } from "./profiles";
import type {
  Command,
  ManifestProfile,
  ProfilesInfo,
  VigilantOptions,
} from "./types";

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

export function removeManagedDependencies(
  dependencies: Record<string, string>,
  managed: string[]
): Record<string, string> {
  managed.forEach((name) => delete dependencies[name]);
  return dependencies;
}

/**
 * Builds a profile targeting specified versions.
 * @param profilesInfo Resolved target and supported profile versions
 * @param managedCapabilities Capabilities that are already managed and can be skipped
 * @returns A profile containing dependencies to compare against
 */
export function buildManifestProfile(
  { supportedProfiles, targetProfile }: ProfilesInfo,
  managedCapabilities: Capability[] = []
): ManifestProfile {
  const allCapabilities = keysOf(targetProfile[0]);
  const managedDependencies = Object.keys(
    resolveCapabilities(managedCapabilities, targetProfile)
  );

  // Use "development" type so we can check for devOnly packages under
  // `dependencies` as well.
  const directDependencies = removeManagedDependencies(
    updateDependencies(
      {},
      resolveCapabilities(allCapabilities, targetProfile),
      "development"
    ),
    managedDependencies
  );

  const { name, version } = require("../package.json");
  return {
    name,
    version,
    dependencies: directDependencies,
    peerDependencies: removeManagedDependencies(
      updateDependencies(
        {},
        resolveCapabilities(allCapabilities, supportedProfiles),
        "peer"
      ),
      managedDependencies
    ),
    devDependencies: directDependencies,
  };
}

export function buildProfileFromConfig(
  config: ReturnType<typeof getCheckConfig>,
  defaultProfile: ManifestProfile
): ManifestProfile {
  if (typeof config === "number") {
    return defaultProfile;
  }

  const {
    capabilities,
    customProfilesPath,
    reactNativeDevVersion,
    reactNativeVersion,
  } = config;

  const supportedVersions = reactNativeVersion.replace(/ [|]{2} /g, ",");
  const versions = `${reactNativeDevVersion},${supportedVersions}`;
  const profilesInfo = parseProfilesString(versions, customProfilesPath);

  return buildManifestProfile(profilesInfo, capabilities);
}

export function inspect(
  manifest: PackageManifest,
  profile: ManifestProfile,
  write: boolean
): Change[] {
  const isMisalignedDirect = (from: string, to: string) => from !== to;
  const isMisalignedPeer = (from: string, to: string) =>
    from !== to && !semverSubset(to, from, { includePrerelease: true });

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

export function makeVigilantCommand({
  customProfiles,
  excludePackages,
  loose,
  versions,
  write,
}: VigilantOptions): Command | undefined {
  if (!versions) {
    error("A comma-separated list of profile versions must be specified.");
    return undefined;
  }

  const profilesInfo = parseProfilesString(versions, customProfiles);

  const checkOptions = {
    loose,
    write,
    supportedVersions: profilesInfo.supportedVersions,
    targetVersion: profilesInfo.targetVersion,
  };

  const exclusionList = isString(excludePackages)
    ? excludePackages.split(",")
    : [];

  const inputProfile = buildManifestProfile(profilesInfo);
  return (manifestPath: string) => {
    let exitCode = 0;
    const config = getCheckConfig(manifestPath, checkOptions);
    try {
      const options = { ...checkOptions, config };
      exitCode = checkPackageManifest(manifestPath, options);
    } catch (_) {
      // Ignore; retry with a full inspection
    }

    const manifest = readPackage(manifestPath);
    if (exclusionList.includes(manifest.name)) {
      return exitCode;
    }

    const currentProfile = buildProfileFromConfig(config, inputProfile);
    const changes = inspect(manifest, currentProfile, write);
    if (changes.length > 0) {
      if (write) {
        modifyManifest(manifestPath, manifest);
      } else {
        const violations = changes
          .map(
            ({ name, from, to, section }) =>
              `    ${name} "${from}" -> "${to}" (${section})`
          )
          .join("\n");
        error(
          `Found ${changes.length} violation(s) in ${manifest.name}:\n${violations}`
        );
        return exitCode + 1;
      }
    }

    return exitCode;
  };
}
