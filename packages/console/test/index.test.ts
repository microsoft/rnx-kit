import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { error, info, warn } from "../src/index";

describe("console", () => {
  const args = ["string", 0, true];

  it("prints error messages", (t) => {
    const errorMock = t.mock.method(console, "error", () => null);

    error(...args);

    equal(errorMock.mock.calls.length, 1);
    deepEqual(errorMock.mock.calls[0].arguments, ["error", ...args]);
  });

  it("prints info messages", (t) => {
    const infoMock = t.mock.method(console, "log", () => null);

    info(...args);

    equal(infoMock.mock.calls.length, 1);
    deepEqual(infoMock.mock.calls[0].arguments, ["info", ...args]);
  });

  it("prints warning messages", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);

    warn(...args);

    equal(warnMock.mock.calls.length, 1);
    deepEqual(warnMock.mock.calls[0].arguments, ["warn", ...args]);
  });
});
