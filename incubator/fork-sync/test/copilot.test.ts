// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, test } from "node:test";

import {
  DEFAULT_ALLOWED_TOOLS,
  DEFAULT_TIMEOUT,
  invokeCopilotReadOnly,
  isCopilotInstalled,
  MAX_TIMEOUT,
} from "../src/modules/copilot.ts";

// Integration tests are slow (invoke Copilot CLI) - opt in with RUN_INTEGRATION=1
const skipIntegration =
  !process.env.RUN_INTEGRATION || !(await isCopilotInstalled());
const skipReason = !process.env.RUN_INTEGRATION
  ? "Slow: set RUN_INTEGRATION=1 to run"
  : skipIntegration
    ? "Copilot CLI not installed"
    : undefined;

// =============================================================================
// Integration test setup
// =============================================================================

let testTempDir: string | undefined;
let testPromptFile: string | undefined;

function setupIntegrationTest(): string {
  if (!testTempDir) {
    testTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "copilot-test-"));
  }
  if (!testPromptFile) {
    testPromptFile = path.join(testTempDir, "test-prompt.md");
    fs.writeFileSync(
      testPromptFile,
      'Reply with exactly: "Hello from Copilot test" and nothing else.',
      "utf-8"
    );
  }
  return testPromptFile;
}

after(() => {
  if (testTempDir) {
    fs.rmSync(testTempDir, { recursive: true, force: true });
  }
});

// =============================================================================
// Option validation
// =============================================================================

test("invokeCopilotReadOnly: missing promptFile returns error", async () => {
  const result = await invokeCopilotReadOnly({ promptFile: "" });
  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes("Prompt file is required"));
});

test("invokeCopilotReadOnly: invalid timeout returns error", async () => {
  const result = await invokeCopilotReadOnly({
    promptFile: "test.md",
    timeout: -5,
  });
  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes("Timeout"));
});

test("invokeCopilotReadOnly: timeout exceeding max returns error", async () => {
  const result = await invokeCopilotReadOnly({
    promptFile: "test.md",
    timeout: MAX_TIMEOUT + 1,
  });
  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes("Timeout"));
});

// =============================================================================
// Constants
// =============================================================================

test("DEFAULT_TIMEOUT is 2 minutes", () => {
  assert.strictEqual(DEFAULT_TIMEOUT, 120000);
});

test("MAX_TIMEOUT is 10 minutes", () => {
  assert.strictEqual(MAX_TIMEOUT, 600000);
});

test("DEFAULT_ALLOWED_TOOLS contains read-only tools", () => {
  assert.ok(DEFAULT_ALLOWED_TOOLS.includes("read"));
  assert.ok(DEFAULT_ALLOWED_TOOLS.includes("search"));
  // Should NOT include mutation tools
  assert.ok(!DEFAULT_ALLOWED_TOOLS.includes("edit"));
  assert.ok(!DEFAULT_ALLOWED_TOOLS.includes("write"));
});

// =============================================================================
// Integration (skipped if CLI missing)
// =============================================================================

test(
  "invokeCopilotReadOnly: basic invocation",
  { skip: skipReason },
  async () => {
    const promptFile = setupIntegrationTest();
    const result = await invokeCopilotReadOnly({
      promptFile,
      timeout: 60000,
    });

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
  }
);

test(
  "invokeCopilotReadOnly: respects custom allowedTools",
  { skip: skipReason },
  async () => {
    const promptFile = setupIntegrationTest();
    const result = await invokeCopilotReadOnly({
      promptFile,
      allowedTools: ["Read"], // Only Read, no Grep or Glob
      timeout: 60000,
    });

    assert.strictEqual(
      result.success,
      true,
      `Expected success, got error: ${result.error}`
    );
    // This is a basic check - Copilot should run successfully with restricted tools
  }
);
