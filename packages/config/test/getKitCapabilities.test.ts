import { getKitCapabilities } from "../src/getKitCapabilities";

describe("getKitCapabilities()", () => {
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  afterEach(() => {
    consoleWarnSpy.mockReset();
  });

  test("throws when supported React Native versions is invalid", () => {
    expect(() => getKitCapabilities({})).toThrow();
    expect(() => getKitCapabilities({ reactNativeVersion: "" })).toThrow();

    expect(() => getKitCapabilities({ reactNativeVersion: "0" })).not.toThrow();
    expect(() =>
      getKitCapabilities({ reactNativeVersion: "0.64" })
    ).not.toThrow();
    expect(() =>
      getKitCapabilities({ reactNativeVersion: "0.64.0" })
    ).not.toThrow();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("throws when React Native dev version does not satisfy supported versions", () => {
    expect(() =>
      getKitCapabilities({
        reactNativeVersion: "0.64.0",
        reactNativeDevVersion: "0",
      })
    ).toThrow();

    expect(() =>
      getKitCapabilities({
        reactNativeVersion: "0.64.0",
        reactNativeDevVersion: "0.64",
      })
    ).toThrow();

    expect(
      getKitCapabilities({
        reactNativeVersion: "0.64.0",
        reactNativeDevVersion: "0.64.0",
      }).reactNativeVersion
    ).toBe("0.64.0");

    expect(() =>
      getKitCapabilities({
        reactNativeVersion: "^0.63 || ^0.64",
        reactNativeDevVersion: "0.62.2",
      })
    ).toThrow();

    expect(
      getKitCapabilities({
        reactNativeVersion: "^0.63 || ^0.64",
        reactNativeDevVersion: "0.64.0",
      }).reactNativeVersion
    ).toBe("^0.63 || ^0.64");

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("returns declared React Native dev version", () => {
    expect(
      getKitCapabilities({
        reactNativeVersion: "^0.63 || ^0.64",
        reactNativeDevVersion: "0.64.0",
      }).reactNativeDevVersion
    ).toBe("0.64.0");
    expect(
      getKitCapabilities({
        reactNativeVersion: "^0.63 || ^0.64",
        reactNativeDevVersion: "^0.64.0",
      }).reactNativeDevVersion
    ).toBe("^0.64.0");
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("returns minimum supported React Native version as dev version when unspecified", () => {
    expect(
      getKitCapabilities({
        reactNativeVersion: "0.64.0",
      }).reactNativeDevVersion
    ).toBe("0.64.0");

    expect(
      getKitCapabilities({
        reactNativeVersion: "^0.63 || ^0.64",
      }).reactNativeDevVersion
    ).toBe("0.63.0");

    expect(
      getKitCapabilities({
        reactNativeVersion: "^0.63.4 || ^0.64.0",
      }).reactNativeDevVersion
    ).toBe("0.63.4");

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("returns 'library' when 'kitType' is undefined", () => {
    expect(getKitCapabilities({ reactNativeVersion: "0.64.0" }).kitType).toBe(
      "library"
    );

    expect(
      getKitCapabilities({ reactNativeVersion: "0.64.0", kitType: "library" })
        .kitType
    ).toBe("library");

    expect(
      getKitCapabilities({ reactNativeVersion: "0.64.0", kitType: "app" })
        .kitType
    ).toBe("app");

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("returns empty array when 'capabilities' is undefined", () => {
    expect(
      getKitCapabilities({ reactNativeVersion: "0.64.0" }).capabilities
    ).toEqual([]);

    expect(
      getKitCapabilities({
        reactNativeVersion: "0.64.0",
        capabilities: ["core-ios"],
      }).capabilities
    ).toEqual(["core-ios"]);

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("warns when 'reactNativeDevVersion' is set and 'kitType' is 'app'", () => {
    getKitCapabilities({
      reactNativeVersion: "^0.64",
      reactNativeDevVersion: "0.64.2",
      kitType: "app",
      capabilities: ["core-ios"],
    });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("warn"),
      "'reactNativeDevVersion' is not used when 'kitType' is 'app'"
    );
  });
});
