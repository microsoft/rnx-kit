import { ReporterImpl } from "../src/reporter";
import type { ReporterOptions } from "../src/types";

describe("ReporterImpl", () => {
  const options: ReporterOptions = { packageName: "test-pkg", name: "Test" };

  it("should create a reporter and log messages", () => {
    const reporter = new ReporterImpl(options);
    expect(reporter).toBeDefined();
    expect(typeof reporter.log).toBe("function");
    expect(typeof reporter.warn).toBe("function");
    expect(typeof reporter.error).toBe("function");
    expect(typeof reporter.verbose).toBe("function");
    expect(typeof reporter.throwError).toBe("function");
    expect(typeof reporter.task).toBe("function");
    expect(typeof reporter.taskAsync).toBe("function");
    expect(typeof reporter.time).toBe("function");
    expect(typeof reporter.timeAsync).toBe("function");
    expect(typeof reporter.finish).toBe("function");
    expect(reporter.data).toBeDefined();
  });

  it("should handle tasks and finish", () => {
    const reporter = new ReporterImpl(options);
    const result = reporter.task("my-task", (r) => {
      r.log("inside task");
      return 42;
    });
    expect(result).toBe(42);
    reporter.finish("done");
  });

  it("should handle async tasks", async () => {
    const reporter = new ReporterImpl(options);
    const result = await reporter.taskAsync("my-async-task", async (r) => {
      r.log("inside async task");
      return 99;
    });
    expect(result).toBe(99);
    reporter.finish("done");
  });

  it("should throw on throwError", () => {
    const reporter = new ReporterImpl(options);
    expect(() => reporter.throwError("fail")).toThrow();
  });
});
