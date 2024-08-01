import { deepEqual, doesNotThrow, equal, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { getKitCapabilities } from "../src/getKitCapabilities";

describe("getKitCapabilities()", () => {
  it("throws when supported React Native versions is invalid", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);

    throws(() => getKitCapabilities({}));
    throws(() => getKitCapabilities({ reactNativeVersion: "" }));

    doesNotThrow(() => getKitCapabilities({ reactNativeVersion: "0" }));
    doesNotThrow(() => getKitCapabilities({ reactNativeVersion: "0.64" }));
    doesNotThrow(() => getKitCapabilities({ reactNativeVersion: "0.64.0" }));
    equal(warnMock.mock.calls.length, 0);
  });

  it("throws when React Native dev version does not satisfy supported versions", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);

    throws(() =>
      getKitCapabilities({
        reactNativeVersion: "0.64.0",
        reactNativeDevVersion: "0",
      })
    );

    throws(() =>
      getKitCapabilities({
        reactNativeVersion: "0.64.0",
        reactNativeDevVersion: "0.64",
      })
    );

    equal(
      getKitCapabilities({
        reactNativeVersion: "0.64.0",
        reactNativeDevVersion: "0.64.0",
      }).reactNativeVersion,
      "0.64.0"
    );

    throws(() =>
      getKitCapabilities({
        reactNativeVersion: "^0.63 || ^0.64",
        reactNativeDevVersion: "0.62.2",
      })
    );

    equal(
      getKitCapabilities({
        reactNativeVersion: "^0.63 || ^0.64",
        reactNativeDevVersion: "0.64.0",
      }).reactNativeVersion,
      "^0.63 || ^0.64"
    );

    equal(warnMock.mock.calls.length, 0);
  });

  it("returns declared React Native dev version", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);

    equal(
      getKitCapabilities({
        reactNativeVersion: "^0.63 || ^0.64",
        reactNativeDevVersion: "0.64.0",
      }).reactNativeDevVersion,
      "0.64.0"
    );
    equal(
      getKitCapabilities({
        reactNativeVersion: "^0.63 || ^0.64",
        reactNativeDevVersion: "^0.64.0",
      }).reactNativeDevVersion,
      "^0.64.0"
    );
    equal(warnMock.mock.calls.length, 0);
  });

  it("returns minimum supported React Native version as dev version when unspecified", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);

    equal(
      getKitCapabilities({
        reactNativeVersion: "0.64.0",
      }).reactNativeDevVersion,
      "0.64.0"
    );

    equal(
      getKitCapabilities({
        reactNativeVersion: "^0.63 || ^0.64",
      }).reactNativeDevVersion,
      "0.63.0"
    );

    equal(
      getKitCapabilities({
        reactNativeVersion: "^0.63.4 || ^0.64.0",
      }).reactNativeDevVersion,
      "0.63.4"
    );

    equal(warnMock.mock.calls.length, 0);
  });

  it("returns 'library' when 'kitType' is undefined", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);

    equal(
      getKitCapabilities({ reactNativeVersion: "0.64.0" }).kitType,
      "library"
    );

    equal(
      getKitCapabilities({ reactNativeVersion: "0.64.0", kitType: "library" })
        .kitType,
      "library"
    );

    equal(
      getKitCapabilities({ reactNativeVersion: "0.64.0", kitType: "app" })
        .kitType,
      "app"
    );

    equal(warnMock.mock.calls.length, 0);
  });

  it("returns empty array when 'capabilities' is undefined", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);

    deepEqual(
      getKitCapabilities({ reactNativeVersion: "0.64.0" }).capabilities,
      []
    );

    deepEqual(
      getKitCapabilities({
        reactNativeVersion: "0.64.0",
        capabilities: ["core-ios"],
      }).capabilities,
      ["core-ios"]
    );

    equal(warnMock.mock.calls.length, 0);
  });

  it("warns when 'reactNativeDevVersion' is set and 'kitType' is 'app'", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);

    getKitCapabilities({
      reactNativeVersion: "^0.64",
      reactNativeDevVersion: "0.64.2",
      kitType: "app",
      capabilities: ["core-ios"],
    });

    equal(warnMock.mock.calls.length, 1);
    equal(
      warnMock.mock.calls[0].arguments[1],
      "'reactNativeDevVersion' is not used when 'kitType' is 'app'"
    );
  });
});
