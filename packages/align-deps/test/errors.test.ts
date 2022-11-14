import { printError, printInfo } from "../src/errors";

describe("printError()", () => {
  const consoleErrorSpy = jest.spyOn(global.console, "error");

  beforeEach(() => {
    consoleErrorSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("prints nothing for 'success'", () => {
    printError("package.json", "success");
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("prints error message for code", () => {
    [
      "invalid-app-requirements" as const,
      "invalid-configuration" as const,
      "invalid-manifest" as const,
      "missing-react-native" as const,
      "not-configured" as const,
      "unsatisfied" as const,
    ].forEach((code) => {
      printError("package.json", code);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});

describe("printInfo()", () => {
  const consoleLogSpy = jest.spyOn(global.console, "log");

  beforeEach(() => {
    consoleLogSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("prints URL for 'align-deps", () => {
    printInfo();
    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
