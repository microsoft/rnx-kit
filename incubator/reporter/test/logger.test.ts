import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { LL_ERROR, LL_LOG, LL_VERBOSE, LL_WARN } from "../src/levels.ts";
import { createLogger, ensureOutput } from "../src/logger.ts";
import type { OutputFunction, OutputWriter } from "../src/types.ts";

describe("logger", () => {
  let mockOutput: {
    calls: { level: string; message: string }[];
    writer: OutputWriter;
  };
  let mockStdout: OutputFunction;
  let mockStderr: OutputFunction;

  beforeEach(() => {
    mockOutput = {
      calls: [],
      writer: {} as OutputWriter,
    };

    mockStdout = (msg: string) => {
      mockOutput.calls.push({ level: "stdout", message: msg });
    };

    mockStderr = (msg: string) => {
      mockOutput.calls.push({ level: "stderr", message: msg });
    };

    // Create mock output writer with all levels
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

  describe("createLogger", () => {
    it("should create logger with default options", () => {
      const logger = createLogger();

      assert(typeof logger.error === "function");
      assert(typeof logger.warn === "function");
      assert(typeof logger.log === "function");
      assert(typeof logger.verbose === "function");
      assert(typeof logger.errorRaw === "function");
      assert(typeof logger.fatalError === "function");
    });

    it("should create logger with custom output writer", () => {
      const logger = createLogger({
        output: mockOutput.writer,
      });

      logger.error("test error");
      logger.warn("test warning");
      logger.log("test log");
      logger.verbose("test verbose");

      assert.strictEqual(mockOutput.calls.length, 4);
      assert(
        mockOutput.calls.some(
          (call) =>
            call.level === "error" && call.message.includes("test error")
        )
      );
      assert(
        mockOutput.calls.some(
          (call) =>
            call.level === "warn" && call.message.includes("test warning")
        )
      );
      assert(
        mockOutput.calls.some(
          (call) => call.level === "log" && call.message.includes("test log")
        )
      );
      assert(
        mockOutput.calls.some(
          (call) =>
            call.level === "verbose" && call.message.includes("test verbose")
        )
      );
    });

    it("should create logger with log level string", () => {
      const logger = createLogger({
        output: LL_ERROR,
      });

      // With error level, only error function should be available
      assert(typeof logger.error === "function");
      // Other levels might be empty functions
      logger.error("error message");
      logger.warn("warn message"); // Should not output
      logger.log("log message"); // Should not output
    });

    it("should use custom prefixes", () => {
      const customPrefixes = {
        error: "CUSTOM ERROR:",
        warn: "CUSTOM WARN:",
        log: "CUSTOM LOG:",
        verbose: "CUSTOM VERBOSE:",
      };

      const logger = createLogger({
        output: mockOutput.writer,
        prefix: customPrefixes,
      });

      logger.error("test");
      logger.warn("test");
      logger.log("test");
      logger.verbose("test");

      assert(
        mockOutput.calls.some(
          (call) =>
            call.level === "error" && call.message.includes("CUSTOM ERROR:")
        )
      );
      assert(
        mockOutput.calls.some(
          (call) =>
            call.level === "warn" && call.message.includes("CUSTOM WARN:")
        )
      );
      assert(
        mockOutput.calls.some(
          (call) => call.level === "log" && call.message.includes("CUSTOM LOG:")
        )
      );
      assert(
        mockOutput.calls.some(
          (call) =>
            call.level === "verbose" && call.message.includes("CUSTOM VERBOSE:")
        )
      );
    });

    it("should handle onError callback", () => {
      const errorCalls: unknown[][] = [];
      const onError = (args: unknown[]) => {
        errorCalls.push(args);
      };

      const logger = createLogger({
        output: mockOutput.writer,
        onError,
      });

      logger.error("error message", { code: 123 });
      logger.warn("warn message");

      assert.strictEqual(errorCalls.length, 2);
      assert.deepStrictEqual(errorCalls[0], ["error message", { code: 123 }]);
      assert.deepStrictEqual(errorCalls[1], ["warn message"]);
    });

    it("should handle partial custom prefixes", () => {
      const partialPrefixes = {
        error: "ERR:",
        warn: "WARN:",
        // log and verbose use defaults
      };

      const logger = createLogger({
        output: mockOutput.writer,
        prefix: partialPrefixes,
      });

      logger.error("test");
      logger.warn("test");
      logger.log("test");

      assert(
        mockOutput.calls.some(
          (call) => call.level === "error" && call.message.includes("ERR:")
        )
      );
      assert(
        mockOutput.calls.some(
          (call) => call.level === "warn" && call.message.includes("WARN:")
        )
      );
      // log should not have custom prefix
      const logCall = mockOutput.calls.find((call) => call.level === "log");
      assert(logCall && !logCall.message.includes("CUSTOM"));
    });

    it("should create logger with empty options", () => {
      const logger = createLogger({});

      assert(typeof logger.error === "function");
      assert(typeof logger.warn === "function");
      assert(typeof logger.log === "function");
      assert(typeof logger.verbose === "function");
    });
  });

  describe("logging methods", () => {
    let logger: ReturnType<typeof createLogger>;

    beforeEach(() => {
      logger = createLogger({
        output: mockOutput.writer,
      });
    });

    it("should log single arguments", () => {
      logger.error("single error");
      logger.warn("single warning");
      logger.log("single log");
      logger.verbose("single verbose");

      assert.strictEqual(mockOutput.calls.length, 4);
      assert(mockOutput.calls.every((call) => call.message.includes("single")));
    });

    it("should log multiple arguments", () => {
      logger.error("error", 123, { key: "value" });

      const errorCall = mockOutput.calls.find((call) => call.level === "error");
      assert(errorCall);
      assert(errorCall.message.includes("error"));
      assert(errorCall.message.includes("123"));
      assert(errorCall.message.includes("key"));
    });

    it("should handle different data types", () => {
      const testObj = { nested: { data: true } };
      const testArray = [1, "two", 3];

      logger.log("string", 42, true, null, undefined, testObj, testArray);

      const logCall = mockOutput.calls.find((call) => call.level === "log");
      assert(logCall);
      assert(logCall.message.includes("string"));
      assert(logCall.message.includes("42"));
      assert(logCall.message.includes("true"));
      assert(logCall.message.includes("nested"));
    });

    it("should handle empty arguments", () => {
      logger.log();

      const logCall = mockOutput.calls.find((call) => call.level === "log");
      assert(logCall);
      // Should still call the output function with just the prefix/newline
    });
  });

  describe("errorRaw", () => {
    it("should log without prefix", () => {
      const logger = createLogger({
        output: mockOutput.writer,
        prefix: {
          error: "ERROR PREFIX:",
        },
      });

      logger.error("with prefix");
      logger.errorRaw("without prefix");

      const regularError = mockOutput.calls.find(
        (call) =>
          call.level === "error" && call.message.includes("ERROR PREFIX:")
      );
      const rawError = mockOutput.calls.find(
        (call) =>
          call.level === "error" &&
          call.message.includes("without prefix") &&
          !call.message.includes("ERROR PREFIX:")
      );

      assert(regularError, "Regular error should include prefix");
      assert(rawError, "Raw error should not include prefix");
    });

    it("should still trigger onError callback", () => {
      const errorCalls: unknown[][] = [];
      const onError = (args: unknown[]) => {
        errorCalls.push(args);
      };

      const logger = createLogger({
        output: mockOutput.writer,
        onError,
      });

      logger.errorRaw("raw error message");

      assert.strictEqual(errorCalls.length, 1);
      assert.deepStrictEqual(errorCalls[0], ["raw error message"]);
    });
  });

  describe("fatalError", () => {
    it("should log error and throw", () => {
      const logger = createLogger({
        output: mockOutput.writer,
      });

      assert.throws(() => {
        logger.fatalError("fatal error message");
      }, /fatal error message/);

      assert(
        mockOutput.calls.some(
          (call) =>
            call.level === "error" &&
            call.message.includes("fatal error message")
        )
      );
    });

    it("should throw with serialized message", () => {
      const logger = createLogger({
        output: mockOutput.writer,
      });

      try {
        logger.fatalError("fatal", { code: 500 }, "error");
        assert.fail("Should have thrown");
      } catch (error) {
        assert(error instanceof Error);
        assert(error.message.includes("fatal"));
        assert(error.message.includes("500"));
        assert(error.message.includes("error"));
      }
    });

    it("should trigger onError callback before throwing", () => {
      const errorCalls: unknown[][] = [];
      const onError = (args: unknown[]) => {
        errorCalls.push(args);
      };

      const logger = createLogger({
        output: mockOutput.writer,
        onError,
      });

      assert.throws(() => {
        logger.fatalError("fatal", 123);
      });

      assert.strictEqual(errorCalls.length, 1);
      assert.deepStrictEqual(errorCalls[0], ["fatal", 123]);
    });
  });

  describe("ensureOutput", () => {
    it("should return OutputWriter when given OutputWriter", () => {
      const output = ensureOutput(mockOutput.writer);
      assert.strictEqual(output, mockOutput.writer);
    });

    it("should create OutputWriter when given log level string", () => {
      const output = ensureOutput(LL_ERROR);
      assert(typeof output === "object");
      assert(typeof output.error === "function");
    });

    it("should use default output when given undefined", () => {
      const output = ensureOutput();
      assert(typeof output === "object");
      // Should have some log level functions
      assert(
        typeof output.error === "function" ||
          typeof output.warn === "function" ||
          typeof output.log === "function" ||
          typeof output.verbose === "function"
      );
    });

    it("should handle all log levels", () => {
      const errorOutput = ensureOutput(LL_ERROR);
      const warnOutput = ensureOutput(LL_WARN);
      const logOutput = ensureOutput(LL_LOG);
      const verboseOutput = ensureOutput(LL_VERBOSE);

      assert(typeof errorOutput.error === "function");
      assert(typeof warnOutput.error === "function");
      assert(typeof warnOutput.warn === "function");
      assert(typeof logOutput.log === "function");
      assert(typeof verboseOutput.verbose === "function");
    });
  });

  describe("default behavior", () => {
    it("should use default prefixes for error and warn", () => {
      const logger = createLogger({
        output: mockOutput.writer,
      });

      logger.error("test error");
      logger.warn("test warning");
      logger.log("test log");
      logger.verbose("test verbose");

      const errorCall = mockOutput.calls.find((call) => call.level === "error");
      const warnCall = mockOutput.calls.find((call) => call.level === "warn");
      const logCall = mockOutput.calls.find((call) => call.level === "log");
      const verboseCall = mockOutput.calls.find(
        (call) => call.level === "verbose"
      );

      assert(errorCall && errorCall.message.includes("ERROR:"));
      assert(warnCall && warnCall.message.includes("WARNING:"));
      // log and verbose should not have default prefixes
      assert(logCall && !logCall.message.includes("LOG:"));
      assert(verboseCall && !verboseCall.message.includes("VERBOSE:"));
    });

    it("should work without explicit output configuration", () => {
      const logger = createLogger();

      // Should not throw when calling logging functions
      assert.doesNotThrow(() => {
        logger.error("test");
        logger.warn("test");
        logger.log("test");
        logger.verbose("test");
      });
    });
  });

  describe("edge cases", () => {
    it("should handle logger with no output functions", () => {
      const emptyOutput: OutputWriter = {};
      const logger = createLogger({
        output: emptyOutput,
      });

      // Should not throw when calling functions that don't exist
      assert.doesNotThrow(() => {
        logger.error("test");
        logger.warn("test");
        logger.log("test");
        logger.verbose("test");
      });
    });

    it("should handle onError callback that throws", () => {
      const onError = () => {
        throw new Error("onError callback error");
      };

      const logger = createLogger({
        output: mockOutput.writer,
        onError,
      });

      // Should still log the original message even if onError throws
      assert.throws(() => {
        logger.error("original message");
      }, /onError callback error/);
    });

    it("should handle output function that throws", () => {
      const throwingOutput: OutputWriter = {
        error: () => {
          throw new Error("Output function error");
        },
      };

      const logger = createLogger({
        output: throwingOutput,
      });

      assert.throws(() => {
        logger.error("test");
      }, /Output function error/);
    });

    it("should serialize complex objects correctly", () => {
      const logger = createLogger({
        output: mockOutput.writer,
      });

      const complexObj = {
        string: "test",
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: {
          deep: "value",
        },
        circular: {} as any,
      };
      complexObj.circular.ref = complexObj;

      logger.log("Complex:", complexObj);

      const logCall = mockOutput.calls.find((call) => call.level === "log");
      assert(logCall);
      assert(logCall.message.includes("Complex:"));
      assert(logCall.message.includes("test"));
      assert(logCall.message.includes("42"));
    });

    it("should handle very long argument lists", () => {
      const logger = createLogger({
        output: mockOutput.writer,
      });

      const manyArgs = Array.from({ length: 100 }, (_, i) => `arg${i}`);

      assert.doesNotThrow(() => {
        logger.log(...manyArgs);
      });

      const logCall = mockOutput.calls.find((call) => call.level === "log");
      assert(logCall);
      assert(logCall.message.includes("arg0"));
      assert(logCall.message.includes("arg99"));
    });
  });

  describe("integration with output", () => {
    it("should work with different log level outputs", () => {
      const errorOnlyLogger = createLogger({ output: LL_ERROR });
      const verboseLogger = createLogger({ output: LL_VERBOSE });

      // Both should have error function
      assert(typeof errorOnlyLogger.error === "function");
      assert(typeof verboseLogger.error === "function");

      // Only verbose should have all functions
      assert(typeof verboseLogger.verbose === "function");
    });

    it("should maintain consistency across multiple calls", () => {
      const logger = createLogger({
        output: mockOutput.writer,
      });

      logger.log("consistent message");
      logger.log("consistent message");

      const logCalls = mockOutput.calls.filter((call) => call.level === "log");
      assert.strictEqual(logCalls.length, 2);
      assert.strictEqual(logCalls[0].message, logCalls[1].message);
    });
  });
});
