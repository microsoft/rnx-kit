// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Tests for modules/log.ts module.
 *
 * Run with: node --test scripts/tests/log.test.ts
 */

import assert from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, test } from "node:test";

import {
  _resetForTesting,
  closeLogger,
  debug,
  error,
  getLogFilePath,
  getLogLevel,
  getTimestampForFile,
  info,
  initLogger,
  isLoggerInitialized,
  logMessage,
  VALID_LOG_LEVELS,
  warn,
  type LogLevel,
} from "../src/modules/log.ts";

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a temporary directory for test log files.
 */
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "log-test-"));
}

/**
 * Clean up a temporary directory.
 */
function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Get log files in a directory.
 */
function getLogFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".log"));
}

/**
 * Read log file content.
 */
function readLogFile(dir: string): string {
  const files = getLogFiles(dir);
  if (files.length === 0) return "";
  return fs.readFileSync(path.join(dir, files[0]), "utf-8");
}

// =============================================================================
// Setup and Teardown
// =============================================================================

beforeEach(() => {
  _resetForTesting();
});

afterEach(async () => {
  await closeLogger();
  _resetForTesting();
});

// =============================================================================
// Initialization Tests
// =============================================================================

test("initLogger: initializes with required name", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir });
    assert.strictEqual(isLoggerInitialized(), true);
    assert.strictEqual(getLogLevel(), "default");
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('initLogger: uses default name "log" when name is empty', () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "", logDir: tempDir });
    info("test");

    const files = getLogFiles(tempDir);
    assert.strictEqual(files.length, 1);
    assert.ok(
      files[0].startsWith("log-"),
      `Expected file to start with "log-", got: ${files[0]}`
    );
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('initLogger: uses default name "log" when name is whitespace only', () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "   ", logDir: tempDir });
    info("test");

    const files = getLogFiles(tempDir);
    assert.strictEqual(files.length, 1);
    assert.ok(
      files[0].startsWith("log-"),
      `Expected file to start with "log-", got: ${files[0]}`
    );
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("initLogger: throws if called twice without close", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir });
    assert.throws(
      () => initLogger({ name: "test2", logDir: tempDir }),
      /already initialized/
    );
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("initLogger: can reinitialize after close", async () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test1", logDir: tempDir });
    await closeLogger();
    assert.strictEqual(isLoggerInitialized(), false);

    assert.doesNotThrow(() => initLogger({ name: "test2", logDir: tempDir }));
    assert.strictEqual(isLoggerInitialized(), true);
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("initLogger: uses default log level if not specified", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir });
    assert.strictEqual(getLogLevel(), "default");
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("initLogger: accepts custom log level", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "debug" });
    assert.strictEqual(getLogLevel(), "debug");
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("initLogger: throws on invalid log level", () => {
  const tempDir = createTempDir();
  try {
    assert.throws(
      () =>
        initLogger({
          name: "test",
          logDir: tempDir,
          logLevel: "invalid" as LogLevel,
        }),
      /Invalid log level/
    );
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("initLogger: log file path is null when level is none", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "none" });
    assert.strictEqual(getLogFilePath(), null);
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("initLogger: log file path is set when level is not none", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "sync", logDir: tempDir, logLevel: "default" });
    const filePath = getLogFilePath();
    assert.ok(filePath !== null);
    assert.ok(filePath.includes("sync-"));
    assert.ok(filePath.endsWith(".log"));
  } finally {
    cleanupTempDir(tempDir);
  }
});

// =============================================================================
// Log Level Filtering Tests
// =============================================================================

test("log.info: writes to file when level=default", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "default" });

    info("test info message");

    const content = readLogFile(tempDir);
    assert.ok(content.includes("[INFO] test info message"));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("log.warn: writes to file when level=default", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "default" });

    warn("test warning");

    const content = readLogFile(tempDir);
    assert.ok(content.includes("[WARN] test warning"));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("log.debug: does NOT write when level=default", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "default" });

    debug("debug message");

    // File should not be created (lazy creation only on actual write)
    const files = getLogFiles(tempDir);
    assert.strictEqual(files.length, 0);
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("log.debug: writes when level=debug", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "debug" });

    debug("debug message");

    const content = readLogFile(tempDir);
    assert.ok(content.includes("[DEBUG] debug message"));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("log level=error: only writes errors", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "error" });

    info("info message");
    warn("warn message");
    debug("debug message");

    // None of these should create a file
    const files = getLogFiles(tempDir);
    assert.strictEqual(files.length, 0);
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("log level=none: no file created for any log level", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "none" });

    info("info");
    warn("warn");
    debug("debug");

    const files = getLogFiles(tempDir);
    assert.strictEqual(files.length, 0);
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("log level=debug: writes all message types", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "debug" });

    info("info message");
    warn("warn message");
    debug("debug message");

    const content = readLogFile(tempDir);
    assert.ok(content.includes("[INFO] info message"));
    assert.ok(content.includes("[WARN] warn message"));
    assert.ok(content.includes("[DEBUG] debug message"));
  } finally {
    cleanupTempDir(tempDir);
  }
});

// =============================================================================
// File Naming Tests
// =============================================================================

test("log file named with correct format: {name}-{timestamp}.log", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "sync", logDir: tempDir, logLevel: "default" });

    info("trigger file creation");

    const files = getLogFiles(tempDir);
    assert.strictEqual(files.length, 1);
    // Pattern: sync-YYYY-MM-DD_HH-MM-SS.log
    assert.ok(
      /^sync-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.log$/.test(files[0]),
      `File name does not match expected pattern: ${files[0]}`
    );
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("timestamp format is correct", () => {
  const timestamp = getTimestampForFile();
  // Pattern: YYYY-MM-DD_HH-MM-SS
  assert.ok(
    /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/.test(timestamp),
    `Timestamp does not match expected pattern: ${timestamp}`
  );
});

// =============================================================================
// Edge Cases
// =============================================================================

test("creates log directory if it does not exist", () => {
  const tempBase = createTempDir();
  const nonexistentDir = path.join(tempBase, "nested", "deep", "logs");

  try {
    assert.ok(!fs.existsSync(nonexistentDir));

    initLogger({ name: "test", logDir: nonexistentDir, logLevel: "default" });
    info("create dir");

    assert.ok(fs.existsSync(nonexistentDir));
    assert.strictEqual(getLogFiles(nonexistentDir).length, 1);
  } finally {
    cleanupTempDir(tempBase);
  }
});

test("handles multi-line messages", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "default" });

    info("line1\nline2\nline3");

    const content = readLogFile(tempDir);
    assert.ok(content.includes("line1\nline2\nline3"));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("handles empty message", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "default" });

    info("");

    const content = readLogFile(tempDir);
    assert.ok(content.includes("[INFO] "));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("handles special characters in message", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "default" });

    const specialMsg = "Unicode: \u00e9\u00e0\u00fc | Symbols: <>&\"'";
    info(specialMsg);

    const content = readLogFile(tempDir);
    assert.ok(content.includes(specialMsg));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("multiple log calls append to same file", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "default" });

    info("first");
    info("second");
    info("third");

    const files = getLogFiles(tempDir);
    assert.strictEqual(files.length, 1, "Should only create one log file");

    const content = readLogFile(tempDir);
    assert.ok(content.includes("first"));
    assert.ok(content.includes("second"));
    assert.ok(content.includes("third"));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("log functions do nothing when not initialized", () => {
  _resetForTesting(); // Ensure not initialized

  // All functions should silently return without error
  assert.doesNotThrow(() => info("not initialized"));
  assert.doesNotThrow(() => warn("not initialized"));
  assert.doesNotThrow(() => error("not initialized"));
  assert.doesNotThrow(() => debug("not initialized"));
});

// =============================================================================
// Constants Tests
// =============================================================================

test("VALID_LOG_LEVELS contains expected levels", () => {
  assert.deepStrictEqual(
    [...VALID_LOG_LEVELS],
    ["none", "error", "default", "debug"]
  );
});

// =============================================================================
// LazyString Tests
// =============================================================================

test("debug: lazy function is NOT called when level=default", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "default" });

    let called = false;
    debug(() => {
      called = true;
      return "lazy debug message";
    });

    assert.strictEqual(called, false);
    assert.deepStrictEqual(getLogFiles(tempDir), []);
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("debug: lazy function IS called when level=debug", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "debug" });

    let called = false;
    debug(() => {
      called = true;
      return "lazy debug message";
    });

    assert.strictEqual(called, true);
    const content = readLogFile(tempDir);
    assert.ok(content.includes("[DEBUG] lazy debug message"));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("info: accepts LazyString function", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir });

    info(() => "lazy info");

    const content = readLogFile(tempDir);
    assert.ok(content.includes("[INFO] lazy info"));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test("logMessage: accepts LazyString", () => {
  const tempDir = createTempDir();
  try {
    initLogger({ name: "test", logDir: tempDir, logLevel: "debug" });

    logMessage("debug", () => "lazy via logMessage");

    const content = readLogFile(tempDir);
    assert.ok(content.includes("[DEBUG] lazy via logMessage"));
  } finally {
    cleanupTempDir(tempDir);
  }
});
