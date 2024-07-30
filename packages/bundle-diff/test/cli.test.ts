import { equal } from "node:assert/strict";
import type * as nodefs from "node:fs";
import { describe, it } from "node:test";
import { cli, numDigits, numDigitsStringLength, withSign } from "../src/cli";
import { aSourceMap, bSourceMap } from "./mockSourceMaps";

describe("numDigits()", () => {
  it("returns number of digits in a number", () => {
    equal(numDigits(1000), 4);
    equal(numDigits(100), 3);
    equal(numDigits(10), 2);
    equal(numDigits(0), 1);
    equal(numDigits(-10), 2);
    equal(numDigits(-100), 3);
    equal(numDigits(-1000), 4);
    equal(numDigits(NaN), withSign(NaN).length);
  });
});

describe("withSign()", () => {
  it("returns number string with a sign", () => {
    equal(withSign(0), "±0");
    equal(withSign(1), "+1");
    equal(withSign(-1), "-1");
    equal(withSign(NaN), "unknown");
  });
});

describe("numDigitsStringLength()", () => {
  it("returns number of digits needed to represent a string's length", () => {
    equal(numDigitsStringLength("@rnx/bundle-diff"), 2);
    equal(numDigitsStringLength(""), 1);
    equal(numDigitsStringLength(null), withSign(NaN).length);
  });
});

describe("cli()", () => {
  const fsMock = {
    readFileSync: (path: string) => {
      switch (path) {
        case "a":
          return JSON.stringify(aSourceMap);

        case "b":
          return JSON.stringify(bSourceMap);

        default:
          throw new Error(`Unexpected read: ${path}`);
      }
    },
  } as typeof nodefs;

  it("outputs nothing if there are no differences", (t) => {
    const logMock = t.mock.method(console, "log", () => null);

    cli("a", "a", fsMock);

    equal(logMock.mock.calls.length, 0);
  });

  it("outputs the difference", (t) => {
    const logMock = t.mock.method(console, "log", () => null);

    cli("a", "b", fsMock);

    equal(logMock.mock.calls.length, 1);
    equal(
      logMock.mock.calls[0].arguments[0],
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
