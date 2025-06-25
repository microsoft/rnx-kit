import {
  asLogLevel,
  defaultLevel,
  nonErrorLevels,
  supportsLevel,
  useErrorStream,
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

  it("useErrorStream returns true for error/warn, false otherwise", () => {
    expect(useErrorStream("error")).toBe(true);
    expect(useErrorStream("warn")).toBe(true);
    expect(useErrorStream("log")).toBe(false);
  });
});
