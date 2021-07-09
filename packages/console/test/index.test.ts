import { error, info, warn } from "../src/index";

jest.mock("chalk");

describe("console", () => {
  const consoleErrorSpy = jest.spyOn(global.console, "error");
  const consoleLogSpy = jest.spyOn(global.console, "log");
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  const args = ["string", 0, true];

  beforeEach(() => {
    consoleErrorSpy.mockReset();
    consoleLogSpy.mockReset();
    consoleWarnSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("prints error messages", () => {
    error(...args);
    expect(consoleErrorSpy).toHaveBeenCalledWith("error", ...args);
  });

  test("prints info messages", () => {
    info(...args);
    expect(consoleLogSpy).toHaveBeenCalledWith("info", ...args);
  });

  test("prints warning messages", () => {
    warn(...args);
    expect(consoleWarnSpy).toHaveBeenCalledWith("warn", ...args);
  });
});
