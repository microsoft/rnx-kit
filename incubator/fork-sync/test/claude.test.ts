// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Tests for modules/claude.ts module.
 *
 * Run with: node --test scripts/tests/claude.test.ts
 */

import assert from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { exec } from "../src/modules/proc.ts";

import {
  DEFAULT_ALLOWED_TOOLS,
  DEFAULT_TIMEOUT,
  formatStreamEvent,
  invokeClaudeReadOnly,
  MAX_TIMEOUT,
  parseStreamEvent,
} from "../src/modules/claude.ts";

import type { ClaudeStreamEvent } from "../src/modules/claude.ts";

// =============================================================================
// Helper: Check if Claude is installed
// =============================================================================

async function isClaudeInstalled(): Promise<boolean> {
  try {
    await exec("claude --version");
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Tests: parseStreamEvent
// =============================================================================

test("parseStreamEvent: valid system init event", () => {
  const line = '{"type":"system","subtype":"init"}';
  const event = parseStreamEvent(line);

  assert.notStrictEqual(event, null);
  assert.strictEqual(event!.type, "system");
  assert.strictEqual(event!.subtype, "init");
});

test("parseStreamEvent: valid assistant text event", () => {
  const line = JSON.stringify({
    type: "assistant",
    message: {
      content: [{ type: "text", text: "Hello, world!" }],
    },
  });
  const event = parseStreamEvent(line);

  assert.notStrictEqual(event, null);
  assert.strictEqual(event!.type, "assistant");
  assert.strictEqual(event!.message?.content?.[0]?.text, "Hello, world!");
});

test("parseStreamEvent: valid tool_use event", () => {
  const line = JSON.stringify({
    type: "assistant",
    message: {
      content: [
        {
          type: "tool_use",
          name: "Read",
          input: { file_path: "/path/to/file.ts" },
        },
      ],
    },
  });
  const event = parseStreamEvent(line);

  assert.notStrictEqual(event, null);
  assert.strictEqual(event!.type, "assistant");
  assert.strictEqual(event!.message?.content?.[0]?.type, "tool_use");
  assert.strictEqual(event!.message?.content?.[0]?.name, "Read");
});

test("parseStreamEvent: valid result event", () => {
  const line = '{"type":"result","result":"The analysis shows..."}';
  const event = parseStreamEvent(line);

  assert.notStrictEqual(event, null);
  assert.strictEqual(event!.type, "result");
  assert.strictEqual(event!.result, "The analysis shows...");
});

test("parseStreamEvent: invalid JSON returns null", () => {
  const event = parseStreamEvent("not valid json {{{");
  assert.strictEqual(event, null);
});

test("parseStreamEvent: empty string returns null", () => {
  const event = parseStreamEvent("");
  assert.strictEqual(event, null);
});

test("parseStreamEvent: whitespace-only string returns null", () => {
  const event = parseStreamEvent("   \n\t  ");
  assert.strictEqual(event, null);
});

test("parseStreamEvent: object without type field returns null", () => {
  const event = parseStreamEvent('{"foo":"bar"}');
  assert.strictEqual(event, null);
});

// =============================================================================
// Tests: formatStreamEvent
// =============================================================================

test("formatStreamEvent: system init event", () => {
  const event: ClaudeStreamEvent = { type: "system", subtype: "init" };
  const formatted = formatStreamEvent(event);

  assert.strictEqual(formatted, "[system] Session initialized");
});

test("formatStreamEvent: system unknown subtype", () => {
  const event: ClaudeStreamEvent = { type: "system", subtype: "other" };
  const formatted = formatStreamEvent(event);

  assert.strictEqual(formatted, "[system] other");
});

test("formatStreamEvent: assistant text message", () => {
  const event: ClaudeStreamEvent = {
    type: "assistant",
    message: {
      content: [{ type: "text", text: "Hello!" }],
    },
  };
  const formatted = formatStreamEvent(event);

  assert.strictEqual(formatted, "[assistant] Hello!");
});

test("formatStreamEvent: tool_use with input", () => {
  const event: ClaudeStreamEvent = {
    type: "assistant",
    message: {
      content: [
        {
          type: "tool_use",
          name: "Read",
          input: { file_path: "/path/to/file.ts" },
        },
      ],
    },
  };
  const formatted = formatStreamEvent(event);

  assert.ok(formatted.includes("[tool_use] Read("));
  assert.ok(formatted.includes("file_path"));
});

test("formatStreamEvent: truncates long tool input", () => {
  const longPath = "/very/long/path/" + "a".repeat(100) + "/file.ts";
  const event: ClaudeStreamEvent = {
    type: "assistant",
    message: {
      content: [
        { type: "tool_use", name: "Read", input: { file_path: longPath } },
      ],
    },
  };
  const formatted = formatStreamEvent(event);

  assert.ok(formatted.includes("..."));
  // The input should be truncated to approximately 60 chars + "..."
  assert.ok(formatted.length < 200);
});

test("formatStreamEvent: result event", () => {
  const event: ClaudeStreamEvent = {
    type: "result",
    result: "Analysis complete.",
  };
  const formatted = formatStreamEvent(event);

  assert.strictEqual(formatted, "[result] Analysis complete.");
});

test("formatStreamEvent: result event with long result truncates preview", () => {
  const longResult = "A".repeat(200);
  const event: ClaudeStreamEvent = { type: "result", result: longResult };
  const formatted = formatStreamEvent(event);

  assert.ok(formatted.includes("..."));
  assert.ok(formatted.length < 150);
});

test("formatStreamEvent: user event", () => {
  const event: ClaudeStreamEvent = { type: "user" };
  const formatted = formatStreamEvent(event);

  assert.strictEqual(formatted, "[user] (tool result)");
});

test("formatStreamEvent: assistant with no content", () => {
  const event: ClaudeStreamEvent = { type: "assistant" };
  const formatted = formatStreamEvent(event);

  assert.strictEqual(formatted, "[assistant] (no content)");
});

// =============================================================================
// Tests: Constants
// =============================================================================

test("DEFAULT_ALLOWED_TOOLS contains read-only tools", () => {
  assert.ok(DEFAULT_ALLOWED_TOOLS.includes("Read"));
  assert.ok(DEFAULT_ALLOWED_TOOLS.includes("Grep"));
  assert.ok(DEFAULT_ALLOWED_TOOLS.includes("Glob"));
  // Should NOT include mutation tools
  assert.ok(!DEFAULT_ALLOWED_TOOLS.includes("Edit"));
  assert.ok(!DEFAULT_ALLOWED_TOOLS.includes("Write"));
});

test("DEFAULT_TIMEOUT is 2 minutes", () => {
  assert.strictEqual(DEFAULT_TIMEOUT, 120000);
});

test("MAX_TIMEOUT is 10 minutes", () => {
  assert.strictEqual(MAX_TIMEOUT, 600000);
});

// =============================================================================
// Tests: invokeClaudeReadOnly - Option Validation
// =============================================================================

test("invokeClaudeReadOnly: missing promptFile returns error", async () => {
  const result = await invokeClaudeReadOnly({ promptFile: "" });

  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes("Prompt file is required"));
});

test("invokeClaudeReadOnly: negative timeout returns error", async () => {
  const result = await invokeClaudeReadOnly({
    promptFile: "test.md",
    timeout: -1,
  });

  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes("Timeout must be between"));
});

test("invokeClaudeReadOnly: timeout exceeding max returns error", async () => {
  const result = await invokeClaudeReadOnly({
    promptFile: "test.md",
    timeout: MAX_TIMEOUT + 1,
  });

  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes("Timeout must be between"));
});

// =============================================================================
// Tests: invokeClaudeReadOnly - Integration (skip if Claude not installed)
// =============================================================================

// Integration tests are slow (invoke Claude CLI) - opt in with RUN_INTEGRATION=1
const skipIntegration =
  !process.env.RUN_INTEGRATION || !(await isClaudeInstalled());
const skipReason = !process.env.RUN_INTEGRATION
  ? "Slow: set RUN_INTEGRATION=1 to run"
  : skipIntegration
    ? "Claude CLI not installed"
    : undefined;

// Create a temp directory and prompt file for integration tests
let testTempDir: string | undefined;
let testPromptFile: string | undefined;

function setupIntegrationTest(): string {
  if (!testTempDir) {
    testTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-test-"));
  }
  if (!testPromptFile) {
    testPromptFile = path.join(testTempDir, "test-prompt.md");
    // Simple prompt that doesn't require any tools
    fs.writeFileSync(
      testPromptFile,
      'Reply with exactly: "Hello from Claude test" and nothing else.',
      "utf-8"
    );
  }
  return testPromptFile;
}

function cleanupIntegrationTest(): void {
  if (testTempDir && fs.existsSync(testTempDir)) {
    fs.rmSync(testTempDir, { recursive: true, force: true });
    testTempDir = undefined;
    testPromptFile = undefined;
  }
}

test(
  "invokeClaudeReadOnly: basic invocation returns result",
  { skip: skipReason },
  async () => {
    const promptFile = setupIntegrationTest();

    try {
      const result = await invokeClaudeReadOnly({
        promptFile,
        timeout: 60000,
      });

      // The invocation should succeed
      assert.strictEqual(
        result.success,
        true,
        `Expected success, got error: ${result.error}`
      );
      assert.strictEqual(
        result.exitCode,
        0,
        `Expected exit code 0, got: ${result.exitCode}`
      );
    } finally {
      cleanupIntegrationTest();
    }
  }
);

test(
  "invokeClaudeReadOnly: verbose mode captures events",
  { skip: skipReason },
  async () => {
    const promptFile = setupIntegrationTest();
    const capturedEvents: ClaudeStreamEvent[] = [];

    try {
      const result = await invokeClaudeReadOnly({
        promptFile,
        verbose: false, // Don't spam console during test
        timeout: 60000,
        onStreamEvent: (event) => {
          capturedEvents.push(event);
        },
      });

      assert.strictEqual(
        result.success,
        true,
        `Expected success, got error: ${result.error}`
      );
      // Should have captured at least some events
      assert.ok(
        capturedEvents.length > 0,
        "Expected to capture at least one event"
      );
      // Events should also be in the result
      assert.ok(
        result.events && result.events.length > 0,
        "Expected events in result"
      );
    } finally {
      cleanupIntegrationTest();
    }
  }
);

test(
  "invokeClaudeReadOnly: respects custom allowedTools",
  { skip: skipReason },
  async () => {
    const promptFile = setupIntegrationTest();

    try {
      const result = await invokeClaudeReadOnly({
        promptFile,
        allowedTools: ["Read"], // Only Read, no Grep or Glob
        timeout: 60000,
      });

      assert.strictEqual(
        result.success,
        true,
        `Expected success, got error: ${result.error}`
      );
      // This is a basic check - Claude should run successfully with restricted tools
    } finally {
      cleanupIntegrationTest();
    }
  }
);
