import "jest-extended";
import { parsePlatform } from "../../src/react-native/platform";

describe("React Native > Platform", () => {
  test("parsePlatform() succeeds for all known platforms", () => {
    expect(parsePlatform("ios")).toEqual("ios");
    expect(parsePlatform("android")).toEqual("android");
    expect(parsePlatform("windows")).toEqual("windows");
    expect(parsePlatform("win32")).toEqual("win32");
    expect(parsePlatform("macos")).toEqual("macos");
  });

  test("parsePlatform() throws on failure", () => {
    expect(() => parsePlatform("invalid")).toThrowError();
  });
});
