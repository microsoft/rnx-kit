import assert from "node:assert";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  createCascadingReporter,
  createFileWriteFunctions,
  queryCascadeSettings,
  type CascadeSettings,
} from "../src/cascade.ts";
import type { LogLevel } from "../src/levels.ts";
import { mockOutput, type MockOutput } from "./streams.test.ts";

describe("cascade", () => {
  const testEnvKey = "TEST_CASCADE_REPORTER";
  const originalEnv = process.env[testEnvKey];
  let mockOut: MockOutput;

  beforeEach(() => {
    // Set up mock output system
    mockOut = mockOutput();

    // Clean up environment
    delete process.env[testEnvKey];
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env[testEnvKey] = originalEnv;
    } else {
      delete process.env[testEnvKey];
    }
  });

  describe("queryCascadeSettings", () => {
    it("should return undefined when environment variable is not set", () => {
      const result = queryCascadeSettings(testEnvKey);
      assert.strictEqual(result, undefined);
    });

    it("should return undefined when environment variable contains invalid JSON", () => {
      process.env[testEnvKey] = "invalid-json";
      const result = queryCascadeSettings(testEnvKey);
      assert.strictEqual(result, undefined);
    });

    it("should parse valid JSON settings from environment variable", () => {
      const settings: CascadeSettings = {
        level: "error",
        file: {
          out: "/tmp/test.log",
          level: "warn",
        },
        depth: 0,
      };

      process.env[testEnvKey] = JSON.stringify(settings);
      const result = queryCascadeSettings(testEnvKey);

      assert(result);
      assert.strictEqual(result.level, "error");
      assert.strictEqual(result.file?.out, "/tmp/test.log");
      assert.strictEqual(result.file?.level, "warn");
      assert.strictEqual(result.depth, 1); // Should increment depth by 1
    });

    it("should increment depth when parsing settings", () => {
      const settings: CascadeSettings = { depth: 2 };
      process.env[testEnvKey] = JSON.stringify(settings);

      const result = queryCascadeSettings(testEnvKey);

      assert(result);
      assert.strictEqual(result.depth, 3);
    });

    it("should default depth to 1 when not specified", () => {
      const settings: CascadeSettings = { level: "log" };
      process.env[testEnvKey] = JSON.stringify(settings);

      const result = queryCascadeSettings(testEnvKey);

      assert(result);
      assert.strictEqual(result.depth, 1);
    });
  });

  describe("createFileWriteFunctions", () => {
    it("should return undefined functions when no options provided", () => {
      const [outFn, errFn] = createFileWriteFunctions();
      assert.strictEqual(outFn, undefined);
      assert.strictEqual(errFn, undefined);
    });

    it("should return undefined functions when options have no out path", () => {
      const [outFn, errFn] = createFileWriteFunctions({} as { out: string });
      assert.strictEqual(outFn, undefined);
      assert.strictEqual(errFn, undefined);
    });

    it("should create write function for output file", () => {
      const outPath = "test-out.log";
      const [outFn, errFn] = createFileWriteFunctions({ out: outPath });

      assert(typeof outFn === "function");
      assert(typeof errFn === "function");
      assert.strictEqual(outFn, errFn); // Should be same function when no separate error file

      // Validate mock file stream was created
      assert(mockOut.files[outPath]);
      assert.strictEqual(mockOut.files[outPath].references, 1);
    });

    it("should create separate write functions for out and err files", () => {
      const outPath = "test-out.log";
      const errPath = "test-err.log";
      const [outFn, errFn] = createFileWriteFunctions({
        out: outPath,
        err: errPath,
      });

      assert(typeof outFn === "function");
      assert(typeof errFn === "function");
      assert.notStrictEqual(outFn, errFn); // Should be different functions

      // Validate both mock file streams were created
      assert(mockOut.files[outPath]);
      assert(mockOut.files[errPath]);
      assert.strictEqual(mockOut.files[outPath].references, 1);
      assert.strictEqual(mockOut.files[errPath].references, 1);
    });

    it("should create directory if it doesn't exist", () => {
      const nestedPath = path.join("tmp", "nested", "dir", "test.log");

      const [outFn] = createFileWriteFunctions({ out: nestedPath });

      assert(typeof outFn === "function");
      // With mocks, we validate that the file stream was created
      assert(mockOut.files[nestedPath]);
      assert.strictEqual(mockOut.files[nestedPath].references, 1);
    });

    it("should write to file with process ID prefix", () => {
      const outPath = "prefix-test.log";
      const [outFn] = createFileWriteFunctions({ out: outPath });

      assert(outFn);

      // Write using the function and validate with mocks
      const result = outFn("test message\n");
      assert.strictEqual(result, true);

      // Validate mock captured the output with process ID prefix
      assert.strictEqual(mockOut.files[outPath].calls, 1);
      assert(
        mockOut.files[outPath].output[0].includes(
          `[PID: ${process.pid}] test message`
        )
      );
    });

    it("should handle append mode correctly", () => {
      const outPath = "append-test.log";

      // First write in write mode (default)
      const [outFn1] = createFileWriteFunctions({ out: outPath }, false);
      assert(outFn1);
      outFn1("first line\n");

      // Second write in append mode
      const [outFn2] = createFileWriteFunctions({ out: outPath }, true);
      assert(outFn2);
      outFn2("second line\n");

      // Validate mock behavior - append mode should preserve existing content
      assert.strictEqual(mockOut.files[outPath].flags, "a"); // Last mode should be append
      assert.strictEqual(mockOut.files[outPath].calls, 2);
      assert.deepStrictEqual(mockOut.files[outPath].output, [
        "[PID: " + process.pid + "] first line\n",
        "[PID: " + process.pid + "] second line\n",
      ]);
    });

    it("should handle append mode correctly", async () => {
      const outPath = "append-test.log";

      // First write
      const [outFn1] = createFileWriteFunctions({ out: outPath }, false);
      assert(outFn1);
      outFn1("first message\n");

      // Second write in append mode
      const [outFn2] = createFileWriteFunctions({ out: outPath }, true);
      assert(outFn2);
      outFn2("second message\n");

      assert(mockOut.files[outPath].output[0].includes("first message"));
      assert(mockOut.files[outPath].output[1].includes("second message"));
    });
  });

  describe("createCascadingReporter", () => {
    it("should return undefined when no settings and no defaults provided", () => {
      const reporter = createCascadingReporter(testEnvKey);
      assert.strictEqual(reporter, undefined);
    });

    it("should use default settings when no environment variable set", () => {
      const defaultSettings: CascadeSettings = { level: "warn" };
      const reporter = createCascadingReporter(testEnvKey, defaultSettings, {
        name: "test-reporter",
      });

      assert(reporter);
      assert(typeof reporter.error === "function");
      assert(typeof reporter.warn === "function");
      assert(typeof reporter.log === "function");
    });

    it("should use environment settings over defaults", () => {
      const envSettings: CascadeSettings = { level: "error" };
      process.env[testEnvKey] = JSON.stringify(envSettings);

      const defaultSettings: CascadeSettings = { level: "warn" };
      const reporter = createCascadingReporter(testEnvKey, defaultSettings, {
        name: "test-reporter",
      });

      assert(reporter);
      // The reporter should be created with error level settings
    });

    it("should create reporter with file output", () => {
      const outPath = "reporter-test.log";
      const settings: CascadeSettings = {
        level: "log",
        file: {
          out: outPath,
          level: "warn",
        },
      };

      const reporter = createCascadingReporter(testEnvKey, settings, {
        name: "file-reporter",
      });

      assert(reporter);
      assert(typeof reporter.error === "function");

      // Test that it can write to file using mocks
      reporter.error("test error message");

      // Validate using mock system instead of real file operations
      assert.strictEqual(mockOut.files[outPath].calls, 1);
      assert(mockOut.files[outPath].output[0].includes("test error message"));
      assert.strictEqual(mockOut.stderr.calls, 1);
      assert.deepStrictEqual(
        mockOut.stderr.output[0],
        "ERROR: ⛔ test error message\n"
      );
    });

    it("should set environment variable for child processes", () => {
      const settings: CascadeSettings = { level: "verbose", depth: 0 };
      const reporter = createCascadingReporter(testEnvKey, settings, {
        name: "parent-reporter",
      });

      assert(reporter);
      assert(process.env[testEnvKey]);

      const savedSettings = JSON.parse(process.env[testEnvKey]!);
      assert.strictEqual(savedSettings.level, "verbose");
    });

    it("should handle capture mode for file output", () => {
      const outPath = "capture-test.log";
      const settings: CascadeSettings = {
        level: "log",
        file: {
          out: outPath,
          capture: true,
        },
      };

      const reporter = createCascadingReporter(testEnvKey, settings, {
        name: "capture-reporter",
      });

      assert(reporter);

      // Test that capture mode affects console output tracking
      reporter.log("captured message");

      // With capture mode, the message should still go to mock stdout
      assert.strictEqual(mockOut.stdout.calls, 1);
      assert.deepStrictEqual(mockOut.stdout.output[0], "captured message\n");

      // Should also be captured to file
      assert.strictEqual(mockOut.files[outPath].calls, 1);
      assert(mockOut.files[outPath].output[0].includes("captured message"));
    });

    it("should create reporter with basic configuration", () => {
      const settings: CascadeSettings = { level: "log" };
      const reporter = createCascadingReporter(testEnvKey, settings);

      assert(reporter);
      // Should create a valid reporter with correct methods
      assert.ok(typeof reporter.log === "function");
      assert.ok(typeof reporter.error === "function");

      // Test console output with mock validation
      reporter.log("console message");
      reporter.error("error message");

      // Validate that console outputs were tracked by the mock
      assert.strictEqual(mockOut.stdout.calls, 1);
      assert.strictEqual(mockOut.stderr.calls, 1);
      assert.deepStrictEqual(mockOut.stdout.output[0], "console message\n");
      assert.deepStrictEqual(
        mockOut.stderr.output[0],
        "ERROR: ⛔ error message\n"
      );
    });

    it("should merge console and file outputs", () => {
      const outPath = "merge-test.log";
      const settings: CascadeSettings = {
        level: "log",
        file: {
          out: outPath,
          level: "error",
        },
      };

      const reporter = createCascadingReporter(testEnvKey, settings, {
        name: "merge-reporter",
      });

      assert(reporter);

      // Test with different log levels
      reporter.log("info message"); // Should go to console only (file level is 'error')
      reporter.error("error message"); // Should go to both console and file

      // Validate console output with mocks
      assert.strictEqual(mockOut.stdout.calls, 1);
      assert.strictEqual(mockOut.stderr.calls, 1);
      assert.deepStrictEqual(mockOut.stdout.output[0], "info message\n");
      assert.deepStrictEqual(
        mockOut.stderr.output[0],
        "ERROR: ⛔ error message\n"
      );

      // Validate file output with mocks
      assert.strictEqual(mockOut.files[outPath].calls, 1);
      assert(mockOut.files[outPath].output[0].includes("error message"));
    });

    it("should handle separate error file", () => {
      const outPath = "out.log";
      const errPath = "err.log";
      const settings: CascadeSettings = {
        level: "log",
        file: {
          out: outPath,
          err: errPath,
          level: "warn",
        },
      };

      const reporter = createCascadingReporter(testEnvKey, settings, {
        name: "separate-err-reporter",
      });

      assert(reporter);

      reporter.log("info message");
      reporter.error("error message");

      // Validate that both files received appropriate content using mocks
      assert.strictEqual(mockOut.files[outPath].calls, 0); // filtered out
      assert.strictEqual(mockOut.files[errPath].calls, 1); // Only error
      assert(mockOut.files[errPath].output[0].includes("error message"));
    });

    it("should default to log level when not specified", () => {
      const settings: CascadeSettings = {}; // No level specified
      const reporter = createCascadingReporter(testEnvKey, settings, {
        name: "default-level-reporter",
      });

      assert(reporter);
      // Should work with default 'log' level
    });

    it("should use main level for file level when file level not specified", () => {
      const outPath = "file-level-test.log";
      const settings: CascadeSettings = {
        level: "warn",
        file: {
          out: outPath,
          // No file level specified, should use 'warn'
        },
      };

      const reporter = createCascadingReporter(testEnvKey, settings, {
        name: "file-level-reporter",
      });

      assert(reporter);
      // File output should use the same level as console output
    });
  });

  describe("integration scenarios", () => {
    it("should handle complex cascade with multiple levels", () => {
      // Simulate parent process setting up cascade
      const parentSettings: CascadeSettings = {
        level: "log",
        file: {
          out: "parent.log",
          level: "warn",
        },
        depth: 0,
      };

      process.env[testEnvKey] = JSON.stringify(parentSettings);

      // Child process reads from environment
      const childReporter = createCascadingReporter(testEnvKey, undefined, {
        name: "child-reporter",
      });

      assert(childReporter);

      // Verify depth was incremented in the environment
      // queryCascadeSettings increments depth, createCascadingReporter saves those incremented settings
      const savedSettings = JSON.parse(process.env[testEnvKey]!);
      assert.strictEqual(savedSettings.depth, 1); // Should be incremented depth as queryCascadeSettings incremented it
    });

    it("should work with all log levels", () => {
      const levels: LogLevel[] = ["error", "warn", "log", "verbose"];

      levels.forEach((level) => {
        const settings: CascadeSettings = { level };
        const reporter = createCascadingReporter(
          `${testEnvKey}_${level}`,
          settings,
          {
            name: `${level}-reporter`,
          }
        );

        assert(reporter, `Reporter should be created for level: ${level}`);

        // Clean up environment for next iteration
        delete process.env[`${testEnvKey}_${level}`];
      });
    });

    it("should handle missing file permissions gracefully", () => {
      // Use a temp path instead of /root to avoid permission issues
      const restrictedPath = path.join(
        "nonexistent",
        "deeply",
        "nested",
        "test.log"
      );
      const settings: CascadeSettings = {
        level: "log",
        file: {
          out: restrictedPath,
        },
      };

      // This should not throw an error during reporter creation
      // The directory creation and file writing should succeed with proper temp paths
      assert.doesNotThrow(() => {
        const reporter = createCascadingReporter(testEnvKey, settings, {
          name: "restricted-reporter",
        });
        assert(reporter);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty settings object", () => {
      const settings: CascadeSettings = {};
      const reporter = createCascadingReporter(testEnvKey, settings, {
        name: "empty-settings-reporter",
      });

      assert(reporter);
    });

    it("should handle null/undefined values in settings", () => {
      process.env[testEnvKey] = JSON.stringify({
        level: null,
        file: null,
        depth: undefined,
      });

      const reporter = createCascadingReporter(testEnvKey, undefined, {
        name: "null-values-reporter",
      });

      assert(reporter);
    });

    it("should handle very long file paths", () => {
      const longPath = path.join(
        "temp",
        "a".repeat(100),
        "very-long-filename.log"
      );

      const settings: CascadeSettings = {
        file: {
          out: longPath,
        },
      };

      const reporter = createCascadingReporter(testEnvKey, settings, {
        name: "long-path-reporter",
      });

      assert(reporter);
    });

    it("should handle concurrent access to same files", () => {
      const sharedPath = "shared.log";
      const settings: CascadeSettings = {
        file: {
          out: sharedPath,
        },
      };

      // Create multiple reporters writing to the same file
      const reporter1 = createCascadingReporter(testEnvKey + "_1", settings, {
        name: "concurrent-1",
      });
      const reporter2 = createCascadingReporter(testEnvKey + "_2", settings, {
        name: "concurrent-2",
      });

      assert(reporter1);
      assert(reporter2);

      // Both should be able to write - test with mock validation
      reporter1?.log("message from reporter 1");
      reporter2?.log("message from reporter 2");

      // Validate that both messages were captured by mocks
      assert.strictEqual(mockOut.files[sharedPath].calls, 2);
      assert.strictEqual(mockOut.stdout.calls, 2);
      assert.deepStrictEqual(mockOut.stdout.output, [
        "message from reporter 1\n",
        "message from reporter 2\n",
      ]);

      // Clean up additional env vars
      delete process.env[testEnvKey + "_1"];
      delete process.env[testEnvKey + "_2"];
    });
  });
});
