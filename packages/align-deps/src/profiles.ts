import { error } from "@rnx-kit/console";
import isString from "lodash/isString";
import semverCoerce from "semver/functions/coerce";
import semverSatisfies from "semver/functions/satisfies";
import semverValid from "semver/functions/valid";
import semverIntersects from "semver/ranges/intersects";
import semverValidRange from "semver/ranges/valid";
import { keysOf } from "./helpers";
import { default as defaultPreset } from "./presets/microsoft";
import type {
  MetaPackage,
  Package,
  Profile,
  ProfileMap,
  ProfilesInfo,
  ProfileVersion,
} from "./types";

type Capabilities = Record<string, MetaPackage | Package>;

function getVersionComparator(
  versionOrRange: string
): (profileVersion: ProfileVersion) => boolean {
  const includePrerelease = { includePrerelease: true };

  const version = semverValid(versionOrRange);
  if (version) {
    return (profileVersion: ProfileVersion) =>
      semverSatisfies(version, "^" + profileVersion, includePrerelease);
  }

  const range = semverValidRange(versionOrRange);
  if (range) {
    return (profileVersion: ProfileVersion) =>
      semverIntersects("^" + profileVersion, range, includePrerelease);
  }

  throw new Error(`Invalid 'react-native' version range: ${versionOrRange}`);
}

function isValidProfileMap(
  map: unknown
): map is Partial<ProfileMap> & Capabilities {
  // Just make sure we've got a dictionary since custom profiles can contain
  // only common dependencies.
  return typeof map === "object" && map !== null && map.constructor === Object;
}

function isValidProfileVersion(v: string): v is ProfileVersion {
  return v in defaultPreset;
}

export function loadCustomProfiles(
  customProfilesPath: string | undefined
): Partial<ProfileMap> {
  if (customProfilesPath) {
    const customProfiles: unknown = require(customProfilesPath);
    if (!isValidProfileMap(customProfiles)) {
      const message = `'${customProfilesPath}' doesn't default export profiles`;
      error(
        [
          `${message}. Please make sure that it exports an object with a shape similar to:`,
          "",
          "    module.exports = {",
          '      "0.67": {',
          '        "my-capability": {',
          '          "name": "my-module",',
          '          "version": "1.0.0",',
          "        },",
          "      },",
          "    };",
          "",
        ].join("\n")
      );
      throw new Error(message);
    }

    // Root-level capabilities should be prepended to all profiles to allow
    // version-specific capabilities to override them.
    const commonCapabilities: Capabilities = {};
    const hasCommonCapabilities = Object.keys(customProfiles).reduce(
      (hasCommonCapabilities, key) => {
        if (isValidProfileVersion(key)) {
          return hasCommonCapabilities;
        }

        commonCapabilities[key] = customProfiles[key];
        return true;
      },
      false
    );
    if (hasCommonCapabilities) {
      const allVersions = Object.keys(defaultPreset) as ProfileVersion[];
      return allVersions.reduce<
        Record<string, Record<string, MetaPackage | Package>>
      >((expandedProfiles, version) => {
        // Check whether property exists otherwise Node will complain:
        // Accessing non-existent property '0.67' of module exports inside circular dependency
        const profile =
          version in customProfiles ? customProfiles[version] : undefined;
        expandedProfiles[version] = profile
          ? {
              ...commonCapabilities,
              ...profile,
            }
          : commonCapabilities;
        return expandedProfiles;
      }, {});
    }

    return customProfiles;
  }

  return {};
}

export function getProfileVersionsFor(
  reactVersionRange: string | ProfileVersion[]
): ProfileVersion[] {
  if (!isString(reactVersionRange)) {
    return reactVersionRange;
  }

  const isSatifisedBy = getVersionComparator(reactVersionRange);
  const allVersions = keysOf(defaultPreset);
  return allVersions.reduce<ProfileVersion[]>((profiles, version) => {
    if (isSatifisedBy(version)) {
      profiles.push(version);
    }
    return profiles;
  }, []);
}

export function getProfilesFor(
  reactVersionRange: string | ProfileVersion[],
  customProfilesPath: string | undefined
): Profile[] {
  const customProfiles = loadCustomProfiles(customProfilesPath);
  const profiles = getProfileVersionsFor(reactVersionRange).map((version) => ({
    ...defaultPreset[version],
    ...customProfiles[version],
  }));
  if (profiles.length === 0) {
    throw new Error(
      `Unsupported 'react-native' version/range: ${reactVersionRange}`
    );
  }

  return profiles;
}

export function parseProfilesString(
  versions: string | number,
  customProfilesPath?: string | number
): ProfilesInfo {
  const profileVersions = versions
    .toString()
    .split(",")
    .map((value) => "^" + semverCoerce(value));
  const targetVersion = profileVersions[0];

  // Note: `.sort()` mutates the array
  const supportedVersions = profileVersions.sort().join(" || ");

  return {
    supportedProfiles: getProfilesFor(
      supportedVersions,
      customProfilesPath?.toString()
    ),
    supportedVersions,
    targetProfile: getProfilesFor(
      targetVersion,
      customProfilesPath?.toString()
    ),
    targetVersion,
  };
}

export function profilesSatisfying(
  profiles: ProfileVersion[],
  versionOrRange: string
): ProfileVersion[] {
  const versions = getProfileVersionsFor(versionOrRange);
  return profiles.filter((v) => versions.includes(v));
}

export function resolveCustomProfiles(
  projectRoot: string,
  profilesPath: string | undefined
): string | undefined {
  return profilesPath
    ? require.resolve(profilesPath, { paths: [projectRoot] })
    : undefined;
}
