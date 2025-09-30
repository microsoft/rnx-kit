import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ALL_LOG_LEVELS, LL_ERROR, LL_LOG, LL_VERBOSE } from "../src/levels.ts";
import { createOutput, mergeOutput } from "../src/output.ts";
import type { OutputFunction, OutputWriter } from "../src/types.ts";
import { mockOutput, restoreOutput, type MockOutput } from "./streams.test.ts";

describe("output", () => {
  let mockOut: MockOutput;

  beforeEach(() => {
    // Set up mock output system to prevent real console/file I/O
    mockOut = mockOutput();
  });

  afterEach(() => {
    // Restore original output system and clear mocks
    restoreOutput();
    mockOut.clear();
  });

  describe("createOutput", () => {
    it("should create output writer with default log level", () => {
      const output = createOutput();

      // Should have functions for error, warn, and log (default level)
      assert.ok(typeof output.error === "function");
      assert.ok(typeof output.warn === "function");
      assert.ok(typeof output.log === "function");
      assert.strictEqual(output.verbose, undefined); // Above default level
    });

    it("should create output writer with specific log level", () => {
      const output = createOutput("verbose");

      // Should have all functions when verbose level is set
      assert.ok(typeof output.error === "function");
      assert.ok(typeof output.warn === "function");
      assert.ok(typeof output.log === "function");
      assert.ok(typeof output.verbose === "function");
    });

    it("should create output writer with error level only", () => {
      const output = createOutput("error");

      // Should only have error function
      assert.ok(typeof output.error === "function");
      assert.strictEqual(output.warn, undefined);
      assert.strictEqual(output.log, undefined);
      assert.strictEqual(output.verbose, undefined);
    });

    it("should create output writer with warn level", () => {
      const output = createOutput("warn");

      // Should have error and warn functions
      assert.ok(typeof output.error === "function");
      assert.ok(typeof output.warn === "function");
      assert.strictEqual(output.log, undefined);
      assert.strictEqual(output.verbose, undefined);
    });

    it("should use provided output function for stdout messages", () => {
      const messages: string[] = [];
      const customOut: OutputFunction = (msg) => messages.push(`OUT: ${msg}`);

      const output = createOutput("verbose", customOut);

      // Test log and verbose (stdout messages)
      output.log!("test log message");
      output.verbose!("test verbose message");

      assert.strictEqual(messages.length, 2);
      assert.strictEqual(messages[0], "OUT: test log message");
      assert.strictEqual(messages[1], "OUT: test verbose message");

      // Verify no console output was produced
      assert.strictEqual(mockOut.stdout.calls, 0);
      assert.strictEqual(mockOut.stderr.calls, 0);
    });

    it("should use provided error function for stderr messages", () => {
      const outMessages: string[] = [];
      const errMessages: string[] = [];
      const customOut: OutputFunction = (msg) =>
        outMessages.push(`OUT: ${msg}`);
      const customErr: OutputFunction = (msg) =>
        errMessages.push(`ERR: ${msg}`);

      const output = createOutput("verbose", customOut, customErr);

      // Test all levels
      output.error!("test error message");
      output.warn!("test warn message");
      output.log!("test log message");
      output.verbose!("test verbose message");

      // Error and warn should go to err function
      assert.strictEqual(errMessages.length, 2);
      assert.strictEqual(errMessages[0], "ERR: test error message");
      assert.strictEqual(errMessages[1], "ERR: test warn message");

      // Log and verbose should go to out function
      assert.strictEqual(outMessages.length, 2);
      assert.strictEqual(outMessages[0], "OUT: test log message");
      assert.strictEqual(outMessages[1], "OUT: test verbose message");

      // Verify no console output was produced
      assert.strictEqual(mockOut.stdout.calls, 0);
      assert.strictEqual(mockOut.stderr.calls, 0);
    });

    it("should use outFn for errFn when errFn not provided", () => {
      const messages: string[] = [];
      const customOut: OutputFunction = (msg) =>
        messages.push(`UNIFIED: ${msg}`);

      const output = createOutput("verbose", customOut);

      // All messages should go to the same function
      output.error!("error message");
      output.warn!("warn message");
      output.log!("log message");
      output.verbose!("verbose message");

      assert.strictEqual(messages.length, 4);
      assert.strictEqual(messages[0], "UNIFIED: error message");
      assert.strictEqual(messages[1], "UNIFIED: warn message");
      assert.strictEqual(messages[2], "UNIFIED: log message");
      assert.strictEqual(messages[3], "UNIFIED: verbose message");
    });

    it("should use console streams when no custom functions provided", () => {
      const output = createOutput("verbose");

      // Test console output
      output.error!("console error");
      output.warn!("console warn");
      output.log!("console log");
      output.verbose!("console verbose");

      // Error and warn should go to stderr
      assert.strictEqual(mockOut.stderr.calls, 2);
      assert.deepStrictEqual(mockOut.stderr.output, [
        "console error",
        "console warn",
      ]);

      // Log and verbose should go to stdout
      assert.strictEqual(mockOut.stdout.calls, 2);
      assert.deepStrictEqual(mockOut.stdout.output, [
        "console log",
        "console verbose",
      ]);
    });

    it("should handle invalid log level gracefully", () => {
      // Use an invalid log level and verify it defaults to first level
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output = createOutput("invalid" as any);

      // Should only have error function (first level)
      assert.ok(typeof output.error === "function");
      assert.strictEqual(output.warn, undefined);
      assert.strictEqual(output.log, undefined);
      assert.strictEqual(output.verbose, undefined);
    });
  });

  describe("mergeOutput", () => {
    it("should merge multiple output writers", () => {
      const messages1: string[] = [];
      const messages2: string[] = [];
      const messages3: string[] = [];

      const out1: OutputFunction = (msg) => messages1.push(`1: ${msg}`);
      const out2: OutputFunction = (msg) => messages2.push(`2: ${msg}`);
      const out3: OutputFunction = (msg) => messages3.push(`3: ${msg}`);

      const output1 = createOutput("log", out1);
      const output2 = createOutput("warn", out2);
      const output3 = createOutput("verbose", out3);

      const merged = mergeOutput(output1, output2, output3);

      // Test error level (should go to all that have it)
      merged.error!("error message");
      assert.strictEqual(messages1.length, 1);
      assert.strictEqual(messages2.length, 1);
      assert.strictEqual(messages3.length, 1);
      assert.strictEqual(messages1[0], "1: error message");
      assert.strictEqual(messages2[0], "2: error message");
      assert.strictEqual(messages3[0], "3: error message");

      // Reset and test warn level (should go to output1 and output3, not output2 which only has error/warn)
      messages1.length = 0;
      messages2.length = 0;
      messages3.length = 0;

      merged.warn!("warn message");
      assert.strictEqual(messages1.length, 1);
      assert.strictEqual(messages2.length, 1);
      assert.strictEqual(messages3.length, 1);
      assert.strictEqual(messages1[0], "1: warn message");
      assert.strictEqual(messages2[0], "2: warn message");
      assert.strictEqual(messages3[0], "3: warn message");

      // Reset and test log level (should go to output1 and output3 only)
      messages1.length = 0;
      messages2.length = 0;
      messages3.length = 0;

      merged.log!("log message");
      assert.strictEqual(messages1.length, 1);
      assert.strictEqual(messages2.length, 0); // output2 only has error/warn
      assert.strictEqual(messages3.length, 1);
      assert.strictEqual(messages1[0], "1: log message");
      assert.strictEqual(messages3[0], "3: log message");
    });

    it("should handle empty output array", () => {
      const merged = mergeOutput();

      // All functions should be undefined
      assert.strictEqual(merged.error, undefined);
      assert.strictEqual(merged.warn, undefined);
      assert.strictEqual(merged.log, undefined);
      assert.strictEqual(merged.verbose, undefined);
    });

    it("should handle single output writer", () => {
      const messages: string[] = [];
      const customOut: OutputFunction = (msg) => messages.push(msg);
      const output = createOutput("verbose", customOut);

      const merged = mergeOutput(output);

      // Should behave identically to original
      merged.error!("test error");
      merged.log!("test log");
      merged.verbose!("test verbose");

      assert.strictEqual(messages.length, 3);
      assert.deepStrictEqual(messages, [
        "test error",
        "test log",
        "test verbose",
      ]);
    });

    it("should create combined function for overlapping levels", () => {
      const messages1: string[] = [];
      const messages2: string[] = [];

      const out1: OutputFunction = (msg) => messages1.push(`OUT1: ${msg}`);
      const out2: OutputFunction = (msg) => messages2.push(`OUT2: ${msg}`);

      const output1 = createOutput("log", out1);
      const output2 = createOutput("log", out2);

      const merged = mergeOutput(output1, output2);

      // Both should receive the message
      merged.error!("shared error");
      merged.log!("shared log");

      assert.strictEqual(messages1.length, 2);
      assert.strictEqual(messages2.length, 2);
      assert.deepStrictEqual(messages1, [
        "OUT1: shared error",
        "OUT1: shared log",
      ]);
      assert.deepStrictEqual(messages2, [
        "OUT2: shared error",
        "OUT2: shared log",
      ]);
    });

    it("should merge with console outputs", () => {
      const customMessages: string[] = [];
      const customOut: OutputFunction = (msg) =>
        customMessages.push(`CUSTOM: ${msg}`);

      const consoleOutput = createOutput("log"); // Uses console
      const customOutput = createOutput("log", customOut);

      const merged = mergeOutput(consoleOutput, customOutput);

      merged.error!("test error");
      merged.log!("test log");

      // Custom output should receive messages
      assert.strictEqual(customMessages.length, 2);
      assert.deepStrictEqual(customMessages, [
        "CUSTOM: test error",
        "CUSTOM: test log",
      ]);

      // Console should also receive messages
      assert.strictEqual(mockOut.stderr.calls, 1);
      assert.strictEqual(mockOut.stdout.calls, 1);
      assert.deepStrictEqual(mockOut.stderr.output, ["test error"]);
      assert.deepStrictEqual(mockOut.stdout.output, ["test log"]);
    });

    it("should handle partial output writers", () => {
      const errorMessages: string[] = [];
      const logMessages: string[] = [];

      // Create partial output writers manually
      const errorOnlyOutput: OutputWriter = {
        error: (msg) => errorMessages.push(`ERROR: ${msg}`),
      };

      const logOnlyOutput: OutputWriter = {
        log: (msg) => logMessages.push(`LOG: ${msg}`),
      };

      const merged = mergeOutput(errorOnlyOutput, logOnlyOutput);

      // Should have functions for levels that exist in any writer
      assert.ok(typeof merged.error === "function");
      assert.ok(typeof merged.log === "function");
      assert.strictEqual(merged.warn, undefined);
      assert.strictEqual(merged.verbose, undefined);

      merged.error!("error message");
      merged.log!("log message");

      assert.strictEqual(errorMessages.length, 1);
      assert.strictEqual(logMessages.length, 1);
      assert.strictEqual(errorMessages[0], "ERROR: error message");
      assert.strictEqual(logMessages[0], "LOG: log message");
    });
  });

  describe("integration scenarios", () => {
    it("should work with mixed output levels and merging", () => {
      const verboseMessages: string[] = [];
      const errorMessages: string[] = [];

      const verboseOutput = createOutput("verbose", (msg) =>
        verboseMessages.push(`V: ${msg}`)
      );
      const errorOutput = createOutput("error", (msg) =>
        errorMessages.push(`E: ${msg}`)
      );
      const consoleOutput = createOutput("warn");

      const merged = mergeOutput(verboseOutput, errorOutput, consoleOutput);

      // Test error level (all should receive)
      merged.error!("error msg");
      assert.strictEqual(verboseMessages.length, 1);
      assert.strictEqual(errorMessages.length, 1);
      assert.strictEqual(mockOut.stderr.calls, 1);

      // Test warn level (verbose and console should receive, not error-only)
      merged.warn!("warn msg");
      assert.strictEqual(verboseMessages.length, 2);
      assert.strictEqual(errorMessages.length, 1); // Still 1
      assert.strictEqual(mockOut.stderr.calls, 2);

      // Test log level (only verbose should receive from custom outputs)
      merged.log!("log msg");
      assert.strictEqual(verboseMessages.length, 3);
      assert.strictEqual(errorMessages.length, 1); // Still 1
      assert.strictEqual(mockOut.stderr.calls, 2); // Console output is warn level, no log
      assert.strictEqual(mockOut.stdout.calls, 0); // Console warn level doesn't include log
    });

    it("should handle complex merge scenarios with overlapping outputs", () => {
      const allMessages: string[] = [];
      const logFunction: OutputFunction = (msg) => allMessages.push(msg);

      // Create multiple outputs with same function but different levels
      const output1 = createOutput("error", logFunction);
      const output2 = createOutput("warn", logFunction);
      const output3 = createOutput("log", logFunction);

      const merged = mergeOutput(output1, output2, output3);

      // Error should be called 3 times (once for each output that supports it)
      merged.error!("multi error");
      assert.strictEqual(allMessages.length, 3);
      assert.deepStrictEqual(allMessages, [
        "multi error",
        "multi error",
        "multi error",
      ]);

      // Warn should be called 2 times (output2 and output3)
      allMessages.length = 0;
      merged.warn!("multi warn");
      assert.strictEqual(allMessages.length, 2);
      assert.deepStrictEqual(allMessages, ["multi warn", "multi warn"]);

      // Log should be called 1 time (only output3)
      allMessages.length = 0;
      merged.log!("multi log");
      assert.strictEqual(allMessages.length, 1);
      assert.deepStrictEqual(allMessages, ["multi log"]);
    });
  });

  describe("edge cases", () => {
    it("should handle undefined log level gracefully", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output = createOutput(undefined as any);

      // Should default to default log level behavior
      assert.ok(typeof output.error === "function");
      assert.ok(typeof output.warn === "function");
      assert.ok(typeof output.log === "function");
      assert.strictEqual(output.verbose, undefined);
    });

    it("should handle null output functions", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output = createOutput("log", null as any, null as any);

      // Should fall back to console outputs
      output.error!("null test error");
      output.log!("null test log");

      assert.strictEqual(mockOut.stderr.calls, 1);
      assert.strictEqual(mockOut.stdout.calls, 1);
    });

    it("should handle output functions that throw errors", () => {
      const throwingOut: OutputFunction = () => {
        throw new Error("Output function error");
      };

      const output = createOutput("log", throwingOut);

      // Should not crash when output function throws
      assert.throws(() => output.log!("test message"), /Output function error/);
    });

    it("should handle very long log levels array", () => {
      // Test with all possible log levels
      ALL_LOG_LEVELS.forEach((level) => {
        const output = createOutput(level);
        assert.ok(
          output.error !== undefined,
          `Error should be defined for level ${level}`
        );

        if (level !== LL_ERROR) {
          assert.ok(
            output.warn !== undefined,
            `Warn should be defined for level ${level}`
          );
        }

        if (level === LL_LOG || level === LL_VERBOSE) {
          assert.ok(
            output.log !== undefined,
            `Log should be defined for level ${level}`
          );
        }

        if (level === LL_VERBOSE) {
          assert.ok(
            output.verbose !== undefined,
            `Verbose should be defined for level ${level}`
          );
        }
      });
    });

    it("should handle empty string messages", () => {
      const messages: string[] = [];
      const customOut: OutputFunction = (msg) => messages.push(msg);
      const output = createOutput("log", customOut);

      output.error!("");
      output.log!("");

      assert.strictEqual(messages.length, 2);
      assert.deepStrictEqual(messages, ["", ""]);
    });

    it("should handle very long messages", () => {
      const longMessage = "x".repeat(10000);
      const messages: string[] = [];
      const customOut: OutputFunction = (msg) => messages.push(msg);
      const output = createOutput("log", customOut);

      output.log!(longMessage);

      assert.strictEqual(messages.length, 1);
      assert.strictEqual(messages[0], longMessage);
      assert.strictEqual(messages[0].length, 10000);
    });
  });
});
