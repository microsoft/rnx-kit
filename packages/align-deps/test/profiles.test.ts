import * as path from "path";
import semver from "semver";
import preset from "../src/presets/microsoft/react-native";
import profile_0_62 from "../src/presets/microsoft/react-native/profile-0.62";
import profile_0_63 from "../src/presets/microsoft/react-native/profile-0.63";
import profile_0_64 from "../src/presets/microsoft/react-native/profile-0.64";
import {
  getProfilesFor,
  getProfileVersionsFor,
  loadCustomProfiles,
  profilesSatisfying,
  resolveCustomProfiles,
} from "../src/profiles";
import type { ProfileVersion } from "../src/types";

describe("microsoft/react-native preset", () => {
  test("matches react-native versions", () => {
    const includePrerelease = { includePrerelease: true };
    Object.entries(preset).forEach(([version, capabilities]) => {
      const versionRange = "^" + version;
      Object.entries(capabilities).forEach(([capability, pkg]) => {
        if (capability === "core") {
          expect(
            "version" in pkg &&
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
    const profiles = getProfileVersionsFor(">=0.66.4");
    expect(profiles).toEqual(["0.66", "0.67", "0.68", "0.69", "0.70"]);
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
  });

  test("throws if custom profiles module does not default export an object", () => {
    jest.mock("bad-profiles-module", () => null, { virtual: true });

    expect(() => getProfilesFor("^0.59", "bad-profiles-module")).toThrow(
      "'bad-profiles-module' doesn't default export profiles"
    );

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
      "good-profiles-module"
    );

    expect(skynet.name in profile_0_62).toBe(true);
    expect(skynet.name in profile_0_63).toBe(false);

    expect(consoleErrorSpy).not.toBeCalled();
  });
});

describe("loadCustomProfiles()", () => {
  test("returns any empty object if no custom profiles are specified", () => {
    expect(loadCustomProfiles(undefined)).toEqual({});
  });

  test("throws if custom profiles are not the right shape", () => {
    expect(() =>
      loadCustomProfiles(
        path.join(
          __dirname,
          "__fixtures__",
          "custom-profiles",
          "local-profiles.js"
        )
      )
    ).toThrow("doesn't default export profiles");
  });

  test("loads valid custom profiles", () => {
    expect(
      loadCustomProfiles(
        path.join(
          __dirname,
          "__fixtures__",
          "custom-profiles",
          "valid-profiles.js"
        )
      )
    ).toMatchSnapshot();
  });

  test("prepends root-level capabilities to all profiles", () => {
    expect(
      loadCustomProfiles(
        path.join(
          __dirname,
          "__fixtures__",
          "custom-profiles",
          "root-level-profiles.js"
        )
      )
    ).toMatchSnapshot();
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

describe("resolveCustomProfiles()", () => {
  const projectRoot = `${__dirname}/__fixtures__/custom-profiles`;

  test("handles undefined and empty strings", () => {
    expect(resolveCustomProfiles(projectRoot, undefined)).toBeUndefined();
    expect(resolveCustomProfiles(projectRoot, "")).toBeUndefined();
  });

  test("throws if the module cannot be resolved", () => {
    expect(() =>
      resolveCustomProfiles(projectRoot, "non-existent-custom-profiles")
    ).toThrow("Cannot resolve module");
  });

  test("returns absolute path for module ids", () => {
    const profilesPkg = "custom-profiles-package";
    expect(resolveCustomProfiles(projectRoot, profilesPkg)).toEqual(
      expect.stringContaining(
        path.join(
          "__fixtures__",
          "custom-profiles",
          "node_modules",
          profilesPkg,
          "index.js"
        )
      )
    );
  });

  test("returns absolute path for relative paths", () => {
    expect(resolveCustomProfiles(projectRoot, "./local-profiles.js")).toEqual(
      expect.stringContaining(
        path.join("__fixtures__", "custom-profiles", "local-profiles.js")
      )
    );
  });
});
