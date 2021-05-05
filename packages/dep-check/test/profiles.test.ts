import {
  getProfilesFor,
  getProfileVersionsFor,
  profilesSatisfying,
  ProfileVersion,
} from "../src/profiles";
import profile_0_62 from "../src/profiles/profile-0.62";
import profile_0_63 from "../src/profiles/profile-0.63";
import profile_0_64 from "../src/profiles/profile-0.64";

describe("getProfileVersionsFor()", () => {
  test("returns profile versions for specific version", () => {
    expect(getProfileVersionsFor("0.61.5")).toEqual(["0.61"]);
    expect(getProfileVersionsFor("0.62.2")).toEqual(["0.62"]);
    expect(getProfileVersionsFor("0.63.4")).toEqual(["0.63"]);
    expect(getProfileVersionsFor("0.64.0")).toEqual(["0.64"]);
  });

  test("returns profile for one version range", () => {
    expect(getProfileVersionsFor("^0.62.2")).toEqual(["0.62"]);
    expect(getProfileVersionsFor("^0.63.4")).toEqual(["0.63"]);
    expect(getProfileVersionsFor("^0.64.0")).toEqual(["0.64"]);
  });

  test("returns profiles for bigger version ranges", () => {
    const profiles = getProfileVersionsFor(">=0.62.2");
    expect(profiles).toEqual(["0.62", "0.63", "0.64"]);
  });

  test("returns profiles for multiple version ranges", () => {
    const profiles = getProfileVersionsFor("^0.63.0 || ^0.64.0");
    expect(profiles).toEqual(["0.63", "0.64"]);
  });

  test("returns an empty array when an unsupported version is provided", () => {
    expect(getProfileVersionsFor("^0.60.6")).toEqual([]);
  });

  test("throws when an invalid version is provided", () => {
    expect(() => getProfileVersionsFor("invalid")).toThrowError(
      "Invalid 'react-native' version"
    );
  });
});

describe("getProfilesFor()", () => {
  test("returns profile for specific version", () => {
    const profiles = getProfilesFor("0.64.0");
    expect(profiles).toEqual([profile_0_64]);
  });

  test("returns profile for one version range", () => {
    expect(getProfilesFor("^0.62.2")).toEqual([profile_0_62]);
    expect(getProfilesFor("^0.63.4")).toEqual([profile_0_63]);
    expect(getProfilesFor("^0.64.0")).toEqual([profile_0_64]);
  });

  test("returns profiles for bigger version ranges", () => {
    const profiles = getProfilesFor(">=0.62.2");
    expect(profiles.slice(0, 3)).toEqual([
      profile_0_62,
      profile_0_63,
      profile_0_64,
    ]);
  });

  test("returns profiles for multiple version ranges", () => {
    const profiles = getProfilesFor("^0.63.0 || ^0.64.0");
    expect(profiles).toEqual([profile_0_63, profile_0_64]);
  });

  test("throws when an unsupported version is provided", () => {
    expect(() => getProfilesFor("^0.60.6")).toThrowError(
      "Unsupported 'react-native' version"
    );
  });

  test("throws when an invalid version is provided", () => {
    expect(() => getProfilesFor("invalid")).toThrowError(
      "Invalid 'react-native' version"
    );
  });
});

describe("profilesSatisfying()", () => {
  const profileVersions: ProfileVersion[] = ["0.61", "0.62", "0.63", "0.64"];

  test("returns an empty array when no profiles can satisfy requirements", () => {
    expect(profilesSatisfying([], "^0.63.0 || ^0.64.0")).toEqual([]);
    expect(profilesSatisfying(["0.61"], "^0.63.0 || ^0.64.0")).toEqual([]);
  });

  test("returns all profiles satisfying version", () => {
    expect(profilesSatisfying(profileVersions, "0.63.2")).toEqual(["0.63"]);
    expect(profilesSatisfying(profileVersions, "0.64.0-rc1")).toEqual(["0.64"]);
    expect(profilesSatisfying(profileVersions, "0.64.0")).toEqual(["0.64"]);
  });

  test("returns all profiles satisfying version range", () => {
    expect(
      profilesSatisfying(profileVersions, "^0.63.0-0 || ^0.64.0-0")
    ).toEqual(["0.63", "0.64"]);
    expect(profilesSatisfying(profileVersions, "^0.63.0 || ^0.64.0")).toEqual([
      "0.63",
      "0.64",
    ]);
  });
});
