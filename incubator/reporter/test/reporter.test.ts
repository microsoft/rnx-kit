import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { createReporter } from "../src/reporter.ts";
import type { OutputWriter, ReporterOptions } from "../src/types.ts";

describe("reporter", () => {
  let mockOutput: {
    calls: { level: string; message: string }[];
    writer: OutputWriter;
  };

  beforeEach(() => {
    mockOutput = {
      calls: [],
      writer: {} as OutputWriter,
    };

    mockOutput.writer = {
      error: (msg: string) => {
        mockOutput.calls.push({ level: "error", message: msg });
      },
      warn: (msg: string) => {
        mockOutput.calls.push({ level: "warn", message: msg });
      },
      log: (msg: string) => {
        mockOutput.calls.push({ level: "log", message: msg });
      },
      verbose: (msg: string) => {
        mockOutput.calls.push({ level: "verbose", message: msg });
      },
    };
  });

  describe("createReporter", () => {
    it("should create reporter with string name", () => {
      const reporter = createReporter("test-reporter");

      assert(typeof reporter.error === "function");
      assert(typeof reporter.warn === "function");
      assert(typeof reporter.log === "function");
      assert(typeof reporter.verbose === "function");
      assert(typeof reporter.errorRaw === "function");
      assert(typeof reporter.fatalError === "function");
      assert(typeof reporter.task === "function");
      assert(typeof reporter.measure === "function");
      assert(typeof reporter.start === "function");
      assert(typeof reporter.finish === "function");
      assert(typeof reporter.data === "object");
    });

    it("should create reporter with options object", () => {
      const options: ReporterOptions = {
        name: "test-reporter",
        packageName: "test-package",
        output: mockOutput.writer,
        data: { testKey: "testValue" },
      };

      const reporter = createReporter(options);

      assert(typeof reporter.error === "function");
      assert.strictEqual(reporter.data.testKey, "testValue");
    });
  });

  describe("logging methods", () => {
    let reporter: ReturnType<typeof createReporter>;

    beforeEach(() => {
      reporter = createReporter({
        name: "test",
        output: mockOutput.writer,
      });
    });

    it("should log error messages", () => {
      reporter.error("test error");

      assert(
        mockOutput.calls.some(
          (call) =>
            call.level === "error" && call.message.includes("test error")
        )
      );
    });

    it("should log multiple arguments", () => {
      reporter.log("message", 123, { key: "value" });

      const logCall = mockOutput.calls.find((call) => call.level === "log");
      assert(logCall);
      assert(logCall.message.includes("message"));
      assert(logCall.message.includes("123"));
      assert(logCall.message.includes("key"));
    });
  });

  describe("task", () => {
    let reporter: ReturnType<typeof createReporter>;

    beforeEach(() => {
      reporter = createReporter({
        name: "task-test",
        output: mockOutput.writer,
      });
    });

    it("should execute synchronous task", async () => {
      const result = await reporter.task("sync-task", (taskReporter) => {
        taskReporter.log("task executing");
        return "task result";
      });

      assert.strictEqual(result, "task result");
      assert(
        mockOutput.calls.some((call) => call.message.includes("task executing"))
      );
    });

    it("should handle task errors", async () => {
      await assert.rejects(async () => {
        await reporter.task("error-task", () => {
          throw new Error("task error");
        });
      }, /task error/);
    });
  });

  describe("measure", () => {
    let reporter: ReturnType<typeof createReporter>;

    beforeEach(() => {
      reporter = createReporter({
        name: "measure-test",
        output: mockOutput.writer,
      });
    });

    it("should measure synchronous operation", async () => {
      const result = await reporter.measure("sync-op", () => {
        return "measured result";
      });

      assert.strictEqual(result, "measured result");
    });

    it("should handle measurement errors", async () => {
      await assert.rejects(async () => {
        await reporter.measure("error-op", () => {
          throw new Error("measurement error");
        });
      }, /measurement error/);
    });
  });

  describe("finish", () => {
    it("should finish with value", () => {
      const reporter = createReporter({
        name: "finish-test",
        output: mockOutput.writer,
      });

      const result = reporter.finish({ value: "finished value" });
      assert.strictEqual(result, "finished value");
    });

    it("should handle error results", () => {
      const reporter = createReporter({
        name: "error-finish-test",
        output: mockOutput.writer,
      });

      const error = new Error("finish error");
      assert.throws(() => {
        reporter.finish({ error });
      }, /finish error/);
    });
  });

  describe("data access", () => {
    it("should provide access to session data", () => {
      const reporter = createReporter({
        name: "data-test",
        output: mockOutput.writer,
        data: { customKey: "customValue" },
      });

      assert.strictEqual(reporter.data.customKey, "customValue");
    });

    it("should allow data mutation", () => {
      const reporter = createReporter({
        name: "mutation-test",
        output: mockOutput.writer,
      });

      reporter.data.newKey = "newValue";
      assert.strictEqual(reporter.data.newKey, "newValue");
    });
  });
});
