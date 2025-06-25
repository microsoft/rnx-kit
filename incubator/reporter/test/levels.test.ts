import {
  asLogLevel,
  defaultLevel,
  nonErrorLevels,
  shouldUseErrorStream,
  supportsLevel,
} from "../src/levels";
import { allLogLevels } from "../src/types";

describe("levels", () => {
  it("should export all log levels and default", () => {
    expect(Array.isArray(allLogLevels)).toBe(true);
    expect(typeof defaultLevel).toBe("string");
    expect(Array.isArray(nonErrorLevels)).toBe(true);
  });

  it("asLogLevel returns valid log level or fallback", () => {
    expect(asLogLevel("error")).toBe("error");
    expect(asLogLevel("warn")).toBe("warn");
    expect(asLogLevel("not-a-level", "log")).toBe("log");
  });

  it("supportsLevel returns true/false as expected", () => {
    expect(supportsLevel("error", "log")).toBe(true);
    expect(supportsLevel("verbose", "warn")).toBe(false);
  });

  it("shouldUseErrorStream returns true for error/warn, false otherwise", () => {
    expect(shouldUseErrorStream("error")).toBe(true);
    expect(shouldUseErrorStream("warn")).toBe(true);
    expect(shouldUseErrorStream("log")).toBe(false);
  });
});
