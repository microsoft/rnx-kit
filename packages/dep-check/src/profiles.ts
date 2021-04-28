import semver from "semver";
import profile_0_61 from "./profiles/profile-0.61";
import profile_0_62 from "./profiles/profile-0.62";
import profile_0_63 from "./profiles/profile-0.63";
import profile_0_64 from "./profiles/profile-0.64";
import type { Profile } from "./types";

function getVersionComparator(
  versionOrRange: string
): (versionOrRange: string) => boolean {
  const version = semver.valid(versionOrRange);
  if (version) {
    return (versionRange: string) => semver.satisfies(version, versionRange);
  }

  const range = semver.validRange(versionOrRange);
  if (range) {
    return (versionRange: string) => semver.intersects(versionRange, range);
  }

  throw new Error(`Invalid 'react-native' version range: ${versionOrRange}`);
}

export function getProfilesFor(reactVersionRange: string): Profile[] {
  const isSatifisedBy = getVersionComparator(reactVersionRange);

  const allProfiles: [string, Profile][] = [
    ["^0.61", profile_0_61],
    ["^0.62", profile_0_62],
    ["^0.63", profile_0_63],
    ["^0.64", profile_0_64],
  ];
  const profiles = allProfiles.reduce<Profile[]>(
    (profiles, [versionRange, profile]) => {
      if (isSatifisedBy(versionRange)) {
        profiles.push(profile);
      }
      return profiles;
    },
    []
  );

  if (profiles.length === 0) {
    throw new Error(
      `Unsupported 'react-native' version/range: ${reactVersionRange}`
    );
  }

  return profiles;
}
