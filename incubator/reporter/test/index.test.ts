import * as index from "../src/index";

describe("index", () => {
  it("should export expected functions and types", () => {
    expect(typeof index.createReporter).toBe("function");
    expect(typeof index.globalReporter).toBe("function");
    expect(typeof index.subscribeToError).toBe("function");
    expect(typeof index.subscribeToFinish).toBe("function");
    expect(typeof index.subscribeToStart).toBe("function");
    expect(typeof index.colorText).toBe("function");
    expect(typeof index.formatDuration).toBe("function");
    expect(typeof index.formatPackage).toBe("function");
    expect(typeof index.padString).toBe("function");
    expect(typeof index.serializeArgs).toBe("function");
    expect(typeof index.updateDefaultFormatting).toBe("function");
    expect(typeof index.enablePerformanceTracing).toBe("function");
  });

  it("should create a reporter and global reporter", () => {
    const reporter = index.createReporter({ packageName: "test-pkg" });
    expect(reporter).toBeDefined();
    const global = index.globalReporter();
    expect(global).toBeDefined();
  });
});
