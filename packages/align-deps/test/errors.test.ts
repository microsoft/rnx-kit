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
    const errorCodes = [
      "invalid-app-requirements",
      "invalid-configuration",
      "invalid-manifest",
      "missing-react-native",
      "not-configured",
      "unsatisfied",
    ] as const;
    for (const code of errorCodes) {
      printError("package.json", code);
      expect(consoleErrorSpy).toHaveBeenCalled();
    }
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
