import semver from "semver";
import {
  defaultProfiles,
  getProfilesFor,
  getProfileVersionsFor,
  profilesSatisfying,
} from "../src/profiles";
import profile_0_62 from "../src/profiles/profile-0.62";
import profile_0_63 from "../src/profiles/profile-0.63";
import profile_0_64 from "../src/profiles/profile-0.64";
import { ProfileVersion } from "../src/types";

describe("defaultProfiles", () => {
  test("matches react-native versions", () => {
    const includePrerelease = {
      includePrerelease: true,
    };
    Object.entries(defaultProfiles).forEach(([version, capabilities]) => {
      const versionRange = "^" + version;
      Object.entries(capabilities).forEach(([capability, pkg]) => {
        if (capability === "core" || capability.startsWith("core-")) {
          expect(
            semver.subset(pkg.version, versionRange, includePrerelease)
          ).toBe(true);
        }
      });
    });
  });
});

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
    expect(profiles).toEqual(["0.62", "0.63", "0.64", "0.65"]);
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
  const consoleErrorSpy = jest.spyOn(global.console, "error");

  beforeEach(() => {
    consoleErrorSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns profile for specific version", () => {
    const profiles = getProfilesFor("0.64.0", undefined);
    expect(profiles).toEqual([profile_0_64]);
    expect(consoleErrorSpy).not.toBeCalled();
  });

  test("returns profile for one version range", () => {
    expect(getProfilesFor("^0.62.2", undefined)).toEqual([profile_0_62]);
    expect(getProfilesFor("^0.63.4", undefined)).toEqual([profile_0_63]);
    expect(getProfilesFor("^0.64.0", undefined)).toEqual([profile_0_64]);
  });

  test("returns profiles for bigger version ranges", () => {
    const profiles = getProfilesFor(">=0.62.2", undefined);
    expect(profiles.slice(0, 3)).toEqual([
      profile_0_62,
      profile_0_63,
      profile_0_64,
    ]);
    expect(consoleErrorSpy).not.toBeCalled();
  });

  test("returns profiles for multiple version ranges", () => {
    const profiles = getProfilesFor("^0.63.0 || ^0.64.0", undefined);
    expect(profiles).toEqual([profile_0_63, profile_0_64]);
    expect(consoleErrorSpy).not.toBeCalled();
  });

  test("throws when an unsupported version is provided", () => {
    expect(() => getProfilesFor("^0.60.6", undefined)).toThrowError(
      "Unsupported 'react-native' version"
    );
    expect(consoleErrorSpy).not.toBeCalled();
  });

  test("throws when an invalid version is provided", () => {
    expect(() => getProfilesFor("invalid", undefined)).toThrowError(
      "Invalid 'react-native' version"
    );
    expect(consoleErrorSpy).not.toBeCalled();
  });

  test("throws if custom profiles module does not exist", () => {
    expect(() =>
      getProfilesFor("^0.59", "non-existent-profiles-module")
    ).toThrow(`Cannot find module 'non-existent-profiles-module'`);

    expect(consoleErrorSpy).toBeCalledTimes(2);
  });

  test("throws if custom profiles module path is not returned", () => {
    expect(() =>
      getProfilesFor("^0.59", "undefined-profiles-module", {
        moduleResolver: (() => undefined) as any,
      })
    ).toThrow(`Cannot find module 'undefined-profiles-module'`);

    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("throws if custom profiles module does not default export an object", () => {
    jest.mock("bad-profiles-module", () => null, { virtual: true });

    expect(() =>
      getProfilesFor("^0.59", "bad-profiles-module", {
        moduleResolver: (() => "bad-profiles-module") as any,
      })
    ).toThrow("'bad-profiles-module' doesn't default export profiles");

    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("appends custom profiles", () => {
    const skynet = { name: "skynet", version: "1.0.0" };
    jest.mock(
      "good-profiles-module",
      () => ({ "0.62": { [skynet.name]: skynet } }),
      { virtual: true }
    );

    const [profile_0_62, profile_0_63] = getProfilesFor(
      "^0.62 || ^0.63",
      "good-profiles-module",
      { moduleResolver: (() => "good-profiles-module") as any }
    );

    expect(skynet.name in profile_0_62).toBe(true);
    expect(skynet.name in profile_0_63).toBe(false);

    expect(consoleErrorSpy).not.toBeCalled();
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
