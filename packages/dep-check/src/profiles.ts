import semver from "semver";
import profile_0_61 from "./profiles/profile-0.61";
import profile_0_62 from "./profiles/profile-0.62";
import profile_0_63 from "./profiles/profile-0.63";
import profile_0_64 from "./profiles/profile-0.64";
import profile_0_65 from "./profiles/profile-0.65";
import type { Profile } from "./types";

export type ProfileVersion = "0.61" | "0.62" | "0.63" | "0.64" | "0.65";

const allProfiles: Record<ProfileVersion, Profile> = {
  "0.61": profile_0_61,
  "0.62": profile_0_62,
  "0.63": profile_0_63,
  "0.64": profile_0_64,
  "0.65": profile_0_65,
};

export function getAllProfiles(): Readonly<typeof allProfiles> {
  return allProfiles;
}

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

export function getProfileVersionsFor(
  reactVersionRange: string
): ProfileVersion[] {
  const isSatifisedBy = getVersionComparator(reactVersionRange);
  const allVersions = Object.keys(allProfiles) as ProfileVersion[];
  return allVersions.reduce<ProfileVersion[]>((profiles, version) => {
    if (isSatifisedBy(version)) {
      profiles.push(version);
    }
    return profiles;
  }, []);
}

export function getProfilesFor(reactVersionRange: string): Profile[] {
  const profiles = getProfileVersionsFor(reactVersionRange).map(
    (version) => allProfiles[version]
  );
  if (profiles.length === 0) {
    throw new Error(
      `Unsupported 'react-native' version/range: ${reactVersionRange}`
    );
  }

  return profiles;
}

export function profilesSatisfying(
  profiles: ProfileVersion[],
  versionOrRange: string
): ProfileVersion[] {
  const versions = getProfileVersionsFor(versionOrRange);
  return profiles.filter((v) => versions.includes(v));
}
