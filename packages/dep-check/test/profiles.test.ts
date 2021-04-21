import { getProfilesFor } from "../src/profiles";
import profile_0_62 from "../src/profiles/profile-0.62";
import profile_0_63 from "../src/profiles/profile-0.63";
import profile_0_64 from "../src/profiles/profile-0.64";

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
