import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { printError, printInfo } from "../src/errors.ts";

describe("printError()", () => {
  it("prints nothing for 'success'", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);

    printError("package.json", "success");

    equal(errorSpy.mock.callCount(), 0);
  });

  it("prints error message for code", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);

    const errorCodes = [
      "invalid-app-requirements",
      "invalid-configuration",
      "invalid-manifest",
      "missing-react-native",
      "not-configured",
    ] as const;
    for (const code of errorCodes) {
      printError("package.json", code);

      equal(errorSpy.mock.callCount(), 1);
      errorSpy.mock.resetCalls();
    }
  });
});

describe("printInfo()", () => {
  it("prints URL for 'align-deps", (t) => {
    const logSpy = t.mock.method(console, "log", () => undefined);

    printInfo();

    equal(logSpy.mock.callCount(), 1);
  });
});
