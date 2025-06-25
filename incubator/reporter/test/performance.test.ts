import {
  checkPerformanceEnv,
  decodePerformanceOptions,
  enablePerformanceTracing,
  serializePerfOptions,
} from "../src/performance";

describe("performance", () => {
  it("should serialize and decode performance options", () => {
    expect(serializePerfOptions("enabled")).toBe("enabled");
    expect(serializePerfOptions("file-only", "log.txt")).toBe(
      "file-only,log.txt"
    );
    expect(decodePerformanceOptions("enabled")).toEqual(["enabled", undefined]);
    expect(decodePerformanceOptions("file-only,log.txt")).toEqual([
      "file-only",
      "log.txt",
    ]);
    expect(decodePerformanceOptions()).toEqual(["disabled", undefined]);
  });

  it("should not throw when enabling or checking performance tracing", () => {
    expect(() => enablePerformanceTracing("disabled")).not.toThrow();
    expect(() => checkPerformanceEnv()).not.toThrow();
  });
});
