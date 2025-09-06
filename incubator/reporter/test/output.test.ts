import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import {
  ALL_LOG_LEVELS,
  LL_ERROR,
  LL_LOG,
  LL_VERBOSE,
  LL_WARN,
} from "../src/levels.ts";
import { createOutput, mergeOutput } from "../src/output.ts";
import type { OutputFunction, OutputWriter } from "../src/types.ts";

describe("output", () => {
  // Mock output functions to capture calls
  let mockStdout: { calls: string[]; fn: OutputFunction };
  let mockStderr: { calls: string[]; fn: OutputFunction };
  let mockCustom: { calls: string[]; fn: OutputFunction };

  beforeEach(() => {
    mockStdout = {
      calls: [],
      fn: (msg: string) => {
        mockStdout.calls.push(msg);
      },
    };
    mockStderr = {
      calls: [],
      fn: (msg: string) => {
        mockStderr.calls.push(msg);
      },
    };
    mockCustom = {
      calls: [],
      fn: (msg: string) => {
        mockCustom.calls.push(msg);
      },
    };
  });

  describe("createOutput", () => {
    it("should create output with default log level", () => {
      const output = createOutput();

      // Default level is "log", so should include error, warn, and log
      assert(typeof output.error === "function");
      assert(typeof output.warn === "function");
      assert(typeof output.log === "function");
      assert(output.verbose === undefined);
    });

    it("should create output with error level only", () => {
      const output = createOutput(LL_ERROR);

      assert(typeof output.error === "function");
      assert(output.warn === undefined);
      assert(output.log === undefined);
      assert(output.verbose === undefined);
    });

    it("should create output with warn level", () => {
      const output = createOutput(LL_WARN);

      assert(typeof output.error === "function");
      assert(typeof output.warn === "function");
      assert(output.log === undefined);
      assert(output.verbose === undefined);
    });

    it("should create output with verbose level", () => {
      const output = createOutput(LL_VERBOSE);

      assert(typeof output.error === "function");
      assert(typeof output.warn === "function");
      assert(typeof output.log === "function");
      assert(typeof output.verbose === "function");
    });

    it("should use custom output functions", () => {
      const output = createOutput(LL_LOG, mockStdout.fn, mockStderr.fn);

      output.error?.("error message");
      output.warn?.("warn message");
      output.log?.("log message");

      // Error and warn should go to stderr, log to stdout
      assert.deepStrictEqual(mockStderr.calls, [
        "error message",
        "warn message",
      ]);
      assert.deepStrictEqual(mockStdout.calls, ["log message"]);
    });

    it("should default error function to stdout when custom stdout is provided", () => {
      const output = createOutput(LL_LOG, mockStdout.fn);

      output.error?.("error message");
      output.warn?.("warn message");
      output.log?.("log message");

      // All should go to stdout when no separate stderr is provided
      assert.deepStrictEqual(mockStdout.calls, [
        "error message",
        "warn message",
        "log message",
      ]);
      assert.deepStrictEqual(mockStderr.calls, []);
    });

    it("should handle single custom function for both output and error", () => {
      const output = createOutput(LL_WARN, mockCustom.fn, mockCustom.fn);

      output.error?.("error message");
      output.warn?.("warn message");

      assert.deepStrictEqual(mockCustom.calls, [
        "error message",
        "warn message",
      ]);
    });
  });

  describe("mergeOutput", () => {
    it("should merge multiple output writers", () => {
      const output1 = createOutput(LL_LOG, mockStdout.fn);
      const output2 = createOutput(LL_WARN, mockStderr.fn);

      const merged = mergeOutput(output1, output2);

      // Should have functions from both outputs
      assert(typeof merged.error === "function");
      assert(typeof merged.warn === "function");
      assert(typeof merged.log === "function");
      assert(merged.verbose === undefined);
    });

    it("should call all output functions when merged", () => {
      const output1: OutputWriter = {
        error: mockStdout.fn,
        warn: mockStdout.fn,
        log: mockStdout.fn,
      };
      const output2: OutputWriter = {
        error: mockStderr.fn,
        warn: mockStderr.fn,
      };

      const merged = mergeOutput(output1, output2);

      merged.error?.("error message");
      merged.warn?.("warn message");
      merged.log?.("log message");

      // Error and warn should be called on both outputs
      assert.deepStrictEqual(mockStdout.calls, [
        "error message",
        "warn message",
        "log message",
      ]);
      assert.deepStrictEqual(mockStderr.calls, [
        "error message",
        "warn message",
      ]);
    });

    it("should handle empty merge", () => {
      const merged = mergeOutput();

      assert.strictEqual(merged.error, undefined);
      assert.strictEqual(merged.warn, undefined);
      assert.strictEqual(merged.log, undefined);
      assert.strictEqual(merged.verbose, undefined);
    });

    it("should handle single output merge", () => {
      const output = createOutput(LL_LOG, mockStdout.fn);
      const merged = mergeOutput(output);

      merged.error?.("test");
      merged.warn?.("test");
      merged.log?.("test");

      assert.deepStrictEqual(mockStdout.calls, ["test", "test", "test"]);
    });

    it("should handle outputs with different log levels", () => {
      const errorOnly: OutputWriter = {
        error: mockStdout.fn,
      };
      const verboseOnly: OutputWriter = {
        verbose: mockStderr.fn,
      };

      const merged = mergeOutput(errorOnly, verboseOnly);

      assert(typeof merged.error === "function");
      assert(merged.warn === undefined);
      assert(merged.log === undefined);
      assert(typeof merged.verbose === "function");

      merged.error?.("error");
      merged.verbose?.("verbose");

      assert.deepStrictEqual(mockStdout.calls, ["error"]);
      assert.deepStrictEqual(mockStderr.calls, ["verbose"]);
    });

    it("should handle overlapping output functions", () => {
      const output1: OutputWriter = {
        log: mockStdout.fn,
      };
      const output2: OutputWriter = {
        log: mockStderr.fn,
      };
      const output3: OutputWriter = {
        log: mockCustom.fn,
      };

      const merged = mergeOutput(output1, output2, output3);

      merged.log?.("test message");

      // Should call all three functions
      assert.deepStrictEqual(mockStdout.calls, ["test message"]);
      assert.deepStrictEqual(mockStderr.calls, ["test message"]);
      assert.deepStrictEqual(mockCustom.calls, ["test message"]);
    });

    it("should preserve function identity for single functions", () => {
      const output: OutputWriter = {
        error: mockStdout.fn,
      };

      const merged = mergeOutput(output);

      // Should be the same function, not a wrapper
      assert.strictEqual(merged.error, mockStdout.fn);
    });

    it("should ignore undefined functions", () => {
      const output1: OutputWriter = {
        error: mockStdout.fn,
        warn: undefined,
        log: mockStdout.fn,
      };
      const output2: OutputWriter = {
        error: undefined,
        warn: mockStderr.fn,
        log: undefined,
      };

      const merged = mergeOutput(output1, output2);

      assert.strictEqual(merged.error, mockStdout.fn);
      assert.strictEqual(merged.warn, mockStderr.fn);
      assert.strictEqual(merged.log, mockStdout.fn);
      assert.strictEqual(merged.verbose, undefined);
    });
  });

  describe("level filtering", () => {
    it("should respect log level hierarchy", () => {
      const outputs = ALL_LOG_LEVELS.map((level) =>
        createOutput(level, mockStdout.fn)
      );

      // Error level should only have error
      assert(typeof outputs[0].error === "function");
      assert(outputs[0].warn === undefined);
      assert(outputs[0].log === undefined);
      assert(outputs[0].verbose === undefined);

      // Warn level should have error and warn
      assert(typeof outputs[1].error === "function");
      assert(typeof outputs[1].warn === "function");
      assert(outputs[1].log === undefined);
      assert(outputs[1].verbose === undefined);

      // Log level should have error, warn, and log
      assert(typeof outputs[2].error === "function");
      assert(typeof outputs[2].warn === "function");
      assert(typeof outputs[2].log === "function");
      assert(outputs[2].verbose === undefined);

      // Verbose level should have all levels
      assert(typeof outputs[3].error === "function");
      assert(typeof outputs[3].warn === "function");
      assert(typeof outputs[3].log === "function");
      assert(typeof outputs[3].verbose === "function");
    });
  });

  describe("error handling", () => {
    it("should handle invalid log levels gracefully", () => {
      // Cast to bypass TypeScript checking for testing
      const output = createOutput("invalid" as any, mockStdout.fn);

      // Should default to some safe behavior (likely error only)
      assert(typeof output.error === "function");
    });

    it("should handle output function errors", () => {
      const throwingFn: OutputFunction = () => {
        throw new Error("Output function error");
      };

      const output = createOutput(LL_LOG, throwingFn);

      // Should not throw when creating the output
      assert(typeof output.log === "function");

      // Should throw when calling the function
      assert.throws(() => output.log?.("test"), /Output function error/);
    });
  });
});
