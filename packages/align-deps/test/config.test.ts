import { containsValidPresets, findEmptyRequirements } from "../src/config";

jest.mock("@rnx-kit/config");

describe("containsValidPresets()", () => {
  test("is valid when 'presets' is unset", () => {
    expect(containsValidPresets({})).toBe(true);
  });

  test("is invalid when 'presets' is empty", () => {
    expect(containsValidPresets({ presets: [] })).toBe(false);
  });

  test("is invalid when 'presets' is not an array", () => {
    // @ts-expect-error intentionally passing an invalid type
    expect(containsValidPresets({ presets: "[]" })).toBe(false);
  });
});

describe("findEmptyRequirements()", () => {
  test("is invalid when 'requirements' is unset", () => {
    expect(findEmptyRequirements({})).toBe("requirements");
  });

  test("is invalid when 'requirements' is empty", () => {
    expect(findEmptyRequirements({ requirements: [] })).toBe("requirements");

    expect(
      // @ts-expect-error intentionally passing an invalid type
      findEmptyRequirements({ requirements: { production: [] } })
    ).toBe("requirements.development");

    expect(
      findEmptyRequirements({
        requirements: { development: [], production: [] },
      })
    ).toBe("requirements.development");

    expect(
      findEmptyRequirements({
        // @ts-expect-error intentionally passing an invalid type
        requirements: { development: ["react-native@*"] },
      })
    ).toBe("requirements.production");

    expect(
      findEmptyRequirements({
        requirements: { development: ["react-native@*"], production: [] },
      })
    ).toBe("requirements.production");
  });

  test("is invalid when 'requirements' is not an array", () => {
    // @ts-expect-error intentionally passing an invalid type
    expect(findEmptyRequirements({ requirements: "[]" })).toBe("requirements");

    expect(
      findEmptyRequirements({
        // @ts-expect-error intentionally passing an invalid type
        requirements: { development: "[]", production: "[]" },
      })
    ).toBe("requirements.development");

    expect(
      findEmptyRequirements({
        // @ts-expect-error intentionally passing an invalid type
        requirements: { development: ["react-native@*"], production: "[]" },
      })
    ).toBe("requirements.production");
  });

  test("is valid when 'requirements' contains at least one requirement", () => {
    expect(
      findEmptyRequirements({ requirements: ["react-native@*"] })
    ).toBeUndefined();

    expect(
      findEmptyRequirements({
        requirements: {
          development: ["react-native@*"],
          production: ["react-native@*"],
        },
      })
    ).toBeUndefined();
  });
});
