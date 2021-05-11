import type { Capability } from "@rnx-kit/config";
import { resolveCapabilities } from "../src/capabilities";
import profile_0_62 from "../src/profiles/profile-0.62";
import profile_0_63 from "../src/profiles/profile-0.63";
import profile_0_64 from "../src/profiles/profile-0.64";

describe("resolveCapabilities()", () => {
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  beforeEach(() => {
    consoleWarnSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("dedupes packages", () => {
    const packages = resolveCapabilities(
      ["core-android", "core-ios", "test-app"],
      [profile_0_64]
    );

    const { name } = profile_0_64["core-ios"];
    const { name: testAppName } = profile_0_64["test-app"];
    expect(packages).toEqual({
      [name]: [profile_0_64["core-ios"]],
      [testAppName]: [profile_0_64["test-app"]],
    });

    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("dedupes package versions", () => {
    const packages = resolveCapabilities(
      ["webview"],
      [profile_0_62, profile_0_63, profile_0_64]
    );

    const { name } = profile_0_64["webview"];
    expect(packages).toEqual({
      [name]: [profile_0_62["webview"], profile_0_64["webview"]],
    });

    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("ignores missing/unknown capabilities", () => {
    const packages = resolveCapabilities(
      ["skynet" as Capability, "svg"],
      [profile_0_62, profile_0_63, profile_0_64]
    );

    const { name } = profile_0_64["svg"];
    expect(packages).toEqual({ [name]: [profile_0_64["svg"]] });
    expect(consoleWarnSpy).toBeCalledTimes(1);
  });
});
