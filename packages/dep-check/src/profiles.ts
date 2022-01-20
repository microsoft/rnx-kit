import { error } from "@rnx-kit/console";
import isString from "lodash/isString";
import semver from "semver";
import { keysOf } from "./helpers";
import profile_0_61 from "./profiles/profile-0.61";
import profile_0_62 from "./profiles/profile-0.62";
import profile_0_63 from "./profiles/profile-0.63";
import profile_0_64 from "./profiles/profile-0.64";
import profile_0_65 from "./profiles/profile-0.65";
import profile_0_66 from "./profiles/profile-0.66";
import profile_0_67 from "./profiles/profile-0.67";
import type { Profile, ProfileVersion } from "./types";

type ProfileMap = Record<ProfileVersion, Profile>;

export type ProfilesInfo = {
  supportedProfiles: Profile[];
  supportedVersions: string;
  targetProfile: Profile[];
  targetVersion: string;
};

export const defaultProfiles: Readonly<ProfileMap> = {
  "0.61": profile_0_61,
  "0.62": profile_0_62,
  "0.63": profile_0_63,
  "0.64": profile_0_64,
  "0.65": profile_0_65,
  "0.66": profile_0_66,
  "0.67": profile_0_67,
};

function getVersionComparator(
  versionOrRange: string
): (profileVersion: ProfileVersion) => boolean {
  const includePrerelease = { includePrerelease: true };

  const version = semver.valid(versionOrRange);
  if (version) {
    return (profileVersion: ProfileVersion) =>
      semver.satisfies(version, "^" + profileVersion, includePrerelease);
  }

  const range = semver.validRange(versionOrRange);
  if (range) {
    return (profileVersion: ProfileVersion) =>
      semver.intersects("^" + profileVersion, range, includePrerelease);
  }

  throw new Error(`Invalid 'react-native' version range: ${versionOrRange}`);
}

function isValidProfileMap(map: unknown): map is Partial<ProfileMap> {
  if (typeof map !== "object" || map === null) {
    return false;
  }

  return Object.keys(defaultProfiles).some((version) => version in map);
}

function loadCustomProfiles(
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
          '      "0.63": {',
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
  const allVersions = keysOf(defaultProfiles);
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
    ...defaultProfiles[version],
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
    .map((value) => "^" + semver.coerce(value));
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
