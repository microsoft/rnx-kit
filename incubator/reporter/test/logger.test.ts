import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { LL_ERROR, LL_LOG, LL_VERBOSE, LL_WARN } from "../src/levels.ts";
import { createLogger, ensureOutput } from "../src/logger.ts";
import { createOutput } from "../src/output.ts";
import { openFileWrite } from "../src/streams.ts";
import type { OutputWriter } from "../src/types.ts";
import {
  mockOutput,
  restoreOutput,
  type MockOutput,
  type MockStream,
} from "./streams.test.ts";

describe("logger", () => {
  let mockOut: MockOutput;
  let outputWriter: OutputWriter;
  let outputStream: MockStream;

  beforeEach(() => {
    mockOut = mockOutput();
    outputWriter = createOutput("log", openFileWrite("test.log"));
    outputStream = mockOut.files["test.log"];
  });

  afterEach(() => {
    restoreOutput();
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
        prefix: {},
        output: outputWriter,
      });

      logger.error("test error");
      logger.warn("test warning");
      logger.log("test log");
      logger.verbose("test verbose");

      assert.strictEqual(outputStream.output.length, 3);
      assert.strictEqual(outputStream.output[0], "test error\n");
      assert.strictEqual(outputStream.output[1], "test warning\n");
      assert.strictEqual(outputStream.output[2], "test log\n");
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
        output: "verbose",
        prefix: customPrefixes,
      });

      logger.error("test");
      logger.warn("test");
      logger.log("test");
      logger.verbose("test");

      assert(mockOut.stderr.output.includes("CUSTOM ERROR: test\n"));
      assert(mockOut.stderr.output.includes("CUSTOM WARN: test\n"));
      assert(mockOut.stdout.output.includes("CUSTOM LOG: test\n"));
      assert(mockOut.stdout.output.includes("CUSTOM VERBOSE: test\n"));
    });

    it("should handle onError callback", () => {
      const errorCalls: unknown[][] = [];
      const onError = (args: unknown[]) => {
        errorCalls.push(args);
      };

      const logger = createLogger({
        onError,
      });

      logger.error("error message", { code: 123 });
      logger.warn("warn message");

      assert.strictEqual(errorCalls.length, 1);
      assert.deepStrictEqual(errorCalls[0], ["error message", { code: 123 }]);
    });

    it("should handle partial custom prefixes", () => {
      const partialPrefixes = {
        error: "ERR:",
        warn: "WARN:",
        // log and verbose use defaults
      };

      // Use explicit output that uses mocked streams
      const logger = createLogger({
        output: createOutput("verbose"),
        prefix: partialPrefixes,
      });

      logger.error("test");
      logger.warn("test");
      logger.log("test");

      assert.strictEqual(mockOut.stderr.output[0], "ERR: test\n");
      assert.strictEqual(mockOut.stderr.output[1], "WARN: test\n");
      assert.strictEqual(mockOut.stdout.output[0], "test\n");
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
      mockOut.clear();
      logger = createLogger({
        output: createOutput("verbose"), // Use explicit output with mocked streams
      });
    });

    it("should log multiple arguments", () => {
      logger.error("error", 123, { key: "value" });

      assert.strictEqual(mockOut.stderr.calls, 1);
      assert(mockOut.stderr.output[0].includes("error"));
      assert(mockOut.stderr.output[0].includes("123"));
      assert(mockOut.stderr.output[0].includes("key"));
    });
  });

  describe("errorRaw", () => {
    it("should log without prefix", () => {
      mockOut.clear();
      const logger = createLogger({
        output: createOutput("verbose"), // Use explicit output with mocked streams
        prefix: { error: "ERROR: " },
      });

      logger.error("with prefix");
      logger.errorRaw("without prefix");

      assert.strictEqual(mockOut.stderr.calls, 2);
      assert.strictEqual(mockOut.stderr.output.length, 2);
      assert.strictEqual(mockOut.stderr.output[0], "ERROR:  with prefix\n");
      assert.strictEqual(mockOut.stderr.output[1], "without prefix\n");
    });

    it("should still trigger onError callback", () => {
      const errorCalls: unknown[][] = [];
      const onError = (args: unknown[]) => {
        errorCalls.push(args);
      };

      const logger = createLogger({
        output: createOutput("verbose"), // Use explicit output with mocked streams
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
        output: createOutput("verbose"), // Use explicit output with mocked streams
      });

      assert.throws(() => {
        logger.fatalError("fatal error message");
      }, /fatal error message/);

      assert.strictEqual(mockOut.stderr.calls, 1);
      assert.strictEqual(mockOut.stderr.output.length, 1);
      assert.strictEqual(
        mockOut.stderr.output[0],
        "ERROR: ⛔ fatal error message\n"
      );
    });

    it("should throw with serialized message", () => {
      const logger = createLogger({
        output: createOutput("verbose"), // Use explicit output with mocked streams
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
        output: createOutput("verbose"), // Use explicit output with mocked streams
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
      const output = ensureOutput(outputWriter);
      assert.strictEqual(output, outputWriter);
    });

    it("should create OutputWriter when given log level string", () => {
      const output = ensureOutput(LL_ERROR);
      assert(typeof output === "object");
      assert(typeof output.error === "function");
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
        output: outputWriter,
        onError,
      });

      // Should still log the original message even if onError throws
      assert.throws(() => {
        logger.error("original message");
      }, /onError callback error/);
    });

    it("should serialize complex objects correctly", () => {
      const logger = createLogger({
        output: createOutput("verbose"), // Use explicit output with mocked streams
      });

      const complexObj = {
        string: "test",
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: {
          deep: "value",
        },
        circular: { ref: undefined as unknown },
      };
      complexObj.circular.ref = complexObj;

      logger.log("Complex:", complexObj);
      const logMessage = mockOut.stdout.output[0];
      assert(logMessage);
      assert(logMessage.includes("Complex:"));
      assert(logMessage.includes("test"));
      assert(logMessage.includes("42"));
    });
  });
});
