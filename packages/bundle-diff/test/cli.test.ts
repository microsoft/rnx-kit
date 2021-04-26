import { cli, numDigits, numDigitsStringLength, withSign } from "../src/cli";

jest.mock("fs");

describe("numDigits()", () => {
  test("returns number of digits in a number", () => {
    expect(numDigits(1000)).toBe(4);
    expect(numDigits(100)).toBe(3);
    expect(numDigits(10)).toBe(2);
    expect(numDigits(0)).toBe(1);
    expect(numDigits(-10)).toBe(2);
    expect(numDigits(-100)).toBe(3);
    expect(numDigits(-1000)).toBe(4);
    expect(numDigits(NaN)).toBe(withSign(NaN).length);
  });
});

describe("withSign()", () => {
  test("returns number string with a sign", () => {
    expect(withSign(0)).toBe("±0");
    expect(withSign(1)).toBe("+1");
    expect(withSign(-1)).toBe("-1");
    expect(withSign(NaN)).toBe("unknown");
  });
});

describe("numDigitsStringLength()", () => {
  test("returns number of digits needed to represent a string's length", () => {
    expect(numDigitsStringLength("@rnx/bundle-diff")).toBe(2);
    expect(numDigitsStringLength("")).toBe(1);
    expect(numDigitsStringLength(null)).toBe(withSign(NaN).length);
  });
});

describe("cli()", () => {
  const consoleSpy = jest.spyOn(global.console, "log");

  beforeEach(() => {
    consoleSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("outputs nothing if there are no differences", () => {
    cli("a", "a");
    expect(consoleSpy).not.toBeCalled();
  });

  test("outputs the difference", () => {
    cli("a", "b");
    expect(consoleSpy).toBeCalledWith(
      [
        "     +106    added  /~/node_modules/@babel/runtime/helpers/arrayWithHoles.js",
        "      +96    added  /~/node_modules/lodash-es/_realNames.js",
        "      +49    added  /~/node_modules/@babel/runtime/regenerator/index.js",
        "       +1  changed  /~/node_modules/react/index.js",
        "     -127  removed  /~/node_modules/querystring-es3/index.js",
        "     -286  removed  /~/node_modules/react-native/Libraries/Components/Picker/PickerAndroid.ios.js",
        "     -592  removed  /~/node_modules/react-native/Libraries/Components/Sound/SoundManager.js",
        "  unknown    added  /~/packages/awesome-app/lib/index.js",
      ].join("\n")
    );
  });
});
