// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Tests for progress-ui module.
 *
 * Run with: node --test scripts/tests/progress-ui.test.ts
 */

import assert from "node:assert";
import { test } from "node:test";

import type { ProgressLine, ProgressState } from "../src/modules/tty-ui.ts";
import * as ui from "../src/modules/tty-ui.ts";

// Helper to strip ANSI escape codes for test assertions
// eslint-disable-next-line no-control-regex
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

// =============================================================================
// Tests: ui.isTTY and withTTY
// =============================================================================

test("isTTY returns a boolean", () => {
  assert.strictEqual(typeof ui.isTTY(), "boolean");
});

test("withTTY overrides isTTY value", () => {
  using _ = ui.withTTY(true);
  assert.strictEqual(ui.isTTY(), true);
});

test("withTTY(false) overrides isTTY to false", () => {
  using _ = ui.withTTY(false);
  assert.strictEqual(ui.isTTY(), false);
});

test("withTTY restores previous value on dispose", () => {
  const original = ui.isTTY();
  {
    using _ = ui.withTTY(!original);
    assert.strictEqual(ui.isTTY(), !original);
  }
  assert.strictEqual(ui.isTTY(), original);
});

test("withTTY supports nesting", () => {
  const original = ui.isTTY();
  {
    using _1 = ui.withTTY(true);
    assert.strictEqual(ui.isTTY(), true);
    {
      using _2 = ui.withTTY(false);
      assert.strictEqual(ui.isTTY(), false);
    }
    assert.strictEqual(ui.isTTY(), true);
  }
  assert.strictEqual(ui.isTTY(), original);
});

// =============================================================================
// Tests: colors
// =============================================================================

test("colors.green returns a string", () => {
  const result = ui.colors.green("test");
  assert.strictEqual(typeof result, "string");
  assert.ok(result.includes("test"));
});

test("colors.green adds ANSI codes in TTY mode", () => {
  using _ = ui.withTTY(true);
  const result = ui.colors.green("test");
  assert.ok(result.startsWith("\x1b[32m"), "should start with green code");
  assert.ok(result.endsWith("\x1b[0m"), "should end with reset");
});

test("colors.green returns plain text in non-TTY mode", () => {
  using _ = ui.withTTY(false);
  const result = ui.colors.green("test");
  assert.strictEqual(result, "test");
});

test("colors.red returns a string", () => {
  const result = ui.colors.red("test");
  assert.strictEqual(typeof result, "string");
  assert.ok(result.includes("test"));
});

test("colors.yellow returns a string", () => {
  const result = ui.colors.yellow("test");
  assert.strictEqual(typeof result, "string");
  assert.ok(result.includes("test"));
});

test("colors.cyan returns a string", () => {
  const result = ui.colors.cyan("test");
  assert.strictEqual(typeof result, "string");
  assert.ok(result.includes("test"));
});

test("colors.bold returns a string", () => {
  const result = ui.colors.bold("test");
  assert.strictEqual(typeof result, "string");
  assert.ok(result.includes("test"));
});

test("colors.reset is a string", () => {
  assert.strictEqual(typeof ui.colors.reset, "string");
});

// =============================================================================
// Tests: icons
// =============================================================================

test("icons.ok returns checkmark in TTY mode", () => {
  using _ = ui.withTTY(true);
  const result = ui.icons.ok();
  assert.ok(stripAnsi(result).includes("✓"));
});

test("icons.ok returns [OK] in non-TTY mode", () => {
  using _ = ui.withTTY(false);
  const result = ui.icons.ok();
  assert.strictEqual(result, "[OK]");
});

test("icons.fail returns X in TTY mode", () => {
  using _ = ui.withTTY(true);
  const result = ui.icons.fail();
  assert.ok(stripAnsi(result).includes("✗"));
});

test("icons.fail returns [FAIL] in non-TTY mode", () => {
  using _ = ui.withTTY(false);
  const result = ui.icons.fail();
  assert.strictEqual(result, "[FAIL]");
});

test("icons.warn returns warning in TTY mode", () => {
  using _ = ui.withTTY(true);
  const result = ui.icons.warn();
  assert.ok(stripAnsi(result).includes("⚠"));
});

test("icons.warn returns [WARN] in non-TTY mode", () => {
  using _ = ui.withTTY(false);
  const result = ui.icons.warn();
  assert.strictEqual(result, "[WARN]");
});

test("icons.pending returns bullet in TTY mode", () => {
  using _ = ui.withTTY(true);
  const result = ui.icons.pending();
  assert.strictEqual(result, "•");
});

test("icons.pending returns dash in non-TTY mode", () => {
  using _ = ui.withTTY(false);
  const result = ui.icons.pending();
  assert.strictEqual(result, "-");
});

test("icons.spinner returns braille char in TTY mode", () => {
  using _ = ui.withTTY(true);
  const result = ui.icons.spinner(0);
  assert.ok(stripAnsi(result).includes("⠋"));
});

test("icons.spinner returns asterisk in non-TTY mode", () => {
  using _ = ui.withTTY(false);
  const result = ui.icons.spinner(0);
  assert.strictEqual(result, "*");
});

// =============================================================================
// Tests: progressBar (TTY mode - visual bar)
// =============================================================================

test("progressBar: TTY mode 0% returns empty bar", () => {
  using _ = ui.withTTY(true);
  assert.strictEqual(ui.progressBar(0), "[_____]");
});

test("progressBar: TTY mode 10% returns half block", () => {
  using _ = ui.withTTY(true);
  assert.strictEqual(ui.progressBar(0.1), "[▌____]");
});

test("progressBar: TTY mode 20% returns one full block", () => {
  using _ = ui.withTTY(true);
  assert.strictEqual(ui.progressBar(0.2), "[█____]");
});

test("progressBar: TTY mode 50% returns two and a half blocks", () => {
  using _ = ui.withTTY(true);
  assert.strictEqual(ui.progressBar(0.5), "[██▌__]");
});

test("progressBar: TTY mode 100% returns full bar", () => {
  using _ = ui.withTTY(true);
  assert.strictEqual(ui.progressBar(1), "[█████]");
});

test("progressBar: TTY mode all 11 steps produce correct output", () => {
  using _ = ui.withTTY(true);
  const expected = [
    "[_____]", // 0%
    "[▌____]", // 10%
    "[█____]", // 20%
    "[█▌___]", // 30%
    "[██___]", // 40%
    "[██▌__]", // 50%
    "[███__]", // 60%
    "[███▌_]", // 70%
    "[████_]", // 80%
    "[████▌]", // 90%
    "[█████]", // 100%
  ];

  for (let i = 0; i <= 10; i++) {
    const value = i / 10;
    assert.strictEqual(
      ui.progressBar(value),
      expected[i],
      `Failed at ${i * 10}%`
    );
  }
});

test("progressBar: TTY mode negative values clamped to 0", () => {
  using _ = ui.withTTY(true);
  assert.strictEqual(ui.progressBar(-0.5), "[_____]");
  assert.strictEqual(ui.progressBar(-1), "[_____]");
});

test("progressBar: TTY mode values > 1 clamped to 1", () => {
  using _ = ui.withTTY(true);
  assert.strictEqual(ui.progressBar(1.5), "[█████]");
  assert.strictEqual(ui.progressBar(2), "[█████]");
});

// =============================================================================
// Tests: progressBar (non-TTY mode - percentage)
// =============================================================================

test("progressBar: non-TTY mode returns percentage", () => {
  using _ = ui.withTTY(false);
  assert.strictEqual(ui.progressBar(0), "[0%]");
  assert.strictEqual(ui.progressBar(0.5), "[50%]");
  assert.strictEqual(ui.progressBar(1), "[100%]");
});

test("progressBar: non-TTY mode clamps values", () => {
  using _ = ui.withTTY(false);
  assert.strictEqual(ui.progressBar(-0.5), "[0%]");
  assert.strictEqual(ui.progressBar(1.5), "[100%]");
});

test("progressBar: undefined returns empty string", () => {
  assert.strictEqual(ui.progressBar(undefined), "");
});

// =============================================================================
// Tests: truncateToWidth
// =============================================================================

// --- Plain text (no ANSI) ---

test("truncateToWidth: text shorter than width returns unchanged", () => {
  assert.strictEqual(ui.truncateToWidth("hello", 10), "hello");
});

test("truncateToWidth: text exactly at width returns unchanged", () => {
  assert.strictEqual(ui.truncateToWidth("hello", 5), "hello");
});

test("truncateToWidth: text longer than width gets truncated with ellipsis", () => {
  const result = ui.truncateToWidth("hello world", 6);
  // Should be 5 chars + ellipsis = 6 visible chars
  assert.strictEqual(stripAnsi(result), "hello…");
});

test("truncateToWidth: text one char over width gets truncated", () => {
  const result = ui.truncateToWidth("abcdef", 5);
  // Should be 4 chars + ellipsis = 5 visible chars
  assert.strictEqual(stripAnsi(result), "abcd…");
});

// --- Edge cases ---

test("truncateToWidth: empty string returns empty", () => {
  assert.strictEqual(ui.truncateToWidth("", 10), "");
});

test("truncateToWidth: width 0 returns empty", () => {
  assert.strictEqual(ui.truncateToWidth("hello", 0), "");
});

test("truncateToWidth: width 1 with non-empty text returns ellipsis", () => {
  assert.strictEqual(ui.truncateToWidth("hello", 1), "…");
});

test("truncateToWidth: width 1 with empty text returns empty", () => {
  assert.strictEqual(ui.truncateToWidth("", 1), "");
});

test("truncateToWidth: width 2 truncates to 1 char + ellipsis", () => {
  const result = ui.truncateToWidth("hello", 2);
  assert.strictEqual(stripAnsi(result), "h…");
});

test("truncateToWidth: single char with width 1 returns ellipsis", () => {
  assert.strictEqual(ui.truncateToWidth("a", 1), "…");
});

test("truncateToWidth: single char with width 2 returns unchanged", () => {
  assert.strictEqual(ui.truncateToWidth("a", 2), "a");
});

// --- ANSI escape codes ---

test("truncateToWidth: ANSI codes not counted in visible length", () => {
  const greenText = "\x1b[32mhello\x1b[0m"; // "hello" in green
  // 5 visible chars, should fit in width 5
  assert.strictEqual(ui.truncateToWidth(greenText, 5), greenText);
});

test("truncateToWidth: ANSI text shorter than width returns unchanged", () => {
  const greenText = "\x1b[32mhi\x1b[0m"; // "hi" in green
  assert.strictEqual(ui.truncateToWidth(greenText, 10), greenText);
});

test("truncateToWidth: ANSI text truncated preserves codes and adds reset", () => {
  const greenText = "\x1b[32mhello world\x1b[0m"; // "hello world" in green
  const result = ui.truncateToWidth(greenText, 6);
  // Should have: green code + 5 chars + ellipsis + reset
  assert.ok(result.startsWith("\x1b[32m"), "should start with green code");
  assert.ok(result.includes("…"), "should include ellipsis");
  assert.ok(result.endsWith("\x1b[0m"), "should end with reset");
  // Visible content should be "hello…"
  assert.strictEqual(stripAnsi(result), "hello…");
});

test("truncateToWidth: multiple ANSI codes handled correctly", () => {
  const text = "\x1b[1m\x1b[32mbold green\x1b[0m"; // bold + green
  // 10 visible chars "bold green", should fit in width 10
  assert.strictEqual(ui.truncateToWidth(text, 10), text);
});

test("truncateToWidth: multiple ANSI codes truncated correctly", () => {
  const text = "\x1b[1m\x1b[32mbold green text\x1b[0m"; // "bold green text" = 15 chars
  const result = ui.truncateToWidth(text, 8);
  // Visible should be "bold gr…" (7 + 1 = 8)
  assert.strictEqual(stripAnsi(result), "bold gr…");
});

test("truncateToWidth: ANSI code at cut point handled correctly", () => {
  const text = "abc\x1b[32mdef\x1b[0m"; // "abc" then green "def"
  const result = ui.truncateToWidth(text, 5);
  // Should truncate to "abcd…" (4 chars visible + ellipsis)
  assert.strictEqual(stripAnsi(result), "abcd…");
});

test("truncateToWidth: only ANSI codes (no visible) returns unchanged", () => {
  const text = "\x1b[32m\x1b[0m"; // just color on/off, no visible chars
  assert.strictEqual(ui.truncateToWidth(text, 5), text);
});

// --- Boundary conditions ---

test("truncateToWidth: exactly width-1 visible chars returns unchanged", () => {
  assert.strictEqual(ui.truncateToWidth("abcd", 5), "abcd"); // 4 chars, width 5
});

test("truncateToWidth: exactly width visible chars returns unchanged", () => {
  assert.strictEqual(ui.truncateToWidth("abcde", 5), "abcde"); // 5 chars, width 5
});

test("truncateToWidth: width+1 visible chars gets truncated", () => {
  const result = ui.truncateToWidth("abcdef", 5); // 6 chars, width 5
  assert.strictEqual(stripAnsi(result), "abcd…");
});

// =============================================================================
// Tests: Progress Line Management
// =============================================================================

test("getLines returns empty array initially", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();
  // Clean state after previous tests
  ui.progress.removeAll();
  assert.strictEqual(ui.progress.getAll().length, 0);
});

test("addLine creates a line with processing state", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line = ui.progress.add("test-1", "Test message");
  assert.strictEqual(line.id, "test-1");
  assert.strictEqual(line.message, "Test message");
  assert.strictEqual(line.state, "processing");
  assert.strictEqual(line.indent, 0);
  assert.strictEqual(ui.progress.getAll().length, 1);
});

test("addLine with options: indent", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line = ui.progress.add("test-2", "Indented", { indent: 4 });
  assert.strictEqual(line.indent, 4);
});

test("addLine with options: state", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line = ui.progress.add("test-3", "Pending", { state: "pending" });
  assert.strictEqual(line.state, "pending");
});

test("addLine with options: progressBar", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line = ui.progress.add("test-4", "Loading", { progressBar: 0.5 });
  assert.strictEqual(line.progressBar, 0.5);
});

test("addLine with options: all fields", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line = ui.progress.add("test-5", "Full options", {
    state: "pending",
    indent: 2,
    progressBar: 0,
  });
  assert.strictEqual(line.state, "pending");
  assert.strictEqual(line.indent, 2);
  assert.strictEqual(line.progressBar, 0);
});

test("insertLine inserts at specific index", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line1 = ui.progress.add("first", "First");
  const line3 = ui.progress.add("third", "Third");
  const line2 = ui.progress.insert(1, "second", "Second");

  assert.strictEqual(ui.progress.getAll().indexOf(line1), 0);
  assert.strictEqual(ui.progress.getAll().indexOf(line2), 1);
  assert.strictEqual(ui.progress.getAll().indexOf(line3), 2);
});

test("insertLineAfter inserts after a specific line", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line1 = ui.progress.add("first", "First");
  const line3 = ui.progress.add("third", "Third");
  const line2 = ui.progress.insertAfter(line1, "second", "Second");

  assert.strictEqual(ui.progress.getAll().indexOf(line1), 0);
  assert.strictEqual(ui.progress.getAll().indexOf(line2), 1);
  assert.strictEqual(ui.progress.getAll().indexOf(line3), 2);
});

test("insertLineAfter with unknown line adds at end", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line1 = ui.progress.add("first", "First");
  const unknownLine = {
    id: "unknown",
    message: "msg",
    state: "done" as const,
    indent: 0,
  };
  const line2 = ui.progress.insertAfter(unknownLine, "second", "Second");

  assert.strictEqual(ui.progress.getAll().indexOf(line1), 0);
  assert.strictEqual(ui.progress.getAll().indexOf(line2), 1);
  assert.strictEqual(ui.progress.getAll().length, 2);
});

test("removeLine removes a line", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line = ui.progress.add("remove-test", "To be removed");
  assert.strictEqual(ui.progress.getAll().length, 1);

  const removed = ui.progress.remove(line);
  assert.strictEqual(removed, line);
  assert.strictEqual(ui.progress.getAll().length, 0);
});

test("removeLineAt removes by index", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  ui.progress.add("line-0", "Line 0");
  const line1 = ui.progress.add("line-1", "Line 1");
  ui.progress.add("line-2", "Line 2");

  const removed = ui.progress.removeAt(1);
  assert.strictEqual(removed, line1);
  assert.strictEqual(ui.progress.getAll().length, 2);
});

test("removeLineAt returns undefined for invalid index", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  assert.strictEqual(ui.progress.removeAt(-1), undefined);
  assert.strictEqual(ui.progress.removeAt(100), undefined);
});

test("removeAllLines clears all lines", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  ui.progress.add("a", "A");
  ui.progress.add("b", "B");
  ui.progress.add("c", "C");
  assert.strictEqual(ui.progress.getAll().length, 3);

  const removed = ui.progress.removeAll();
  assert.strictEqual(removed.length, 3);
  assert.strictEqual(ui.progress.getAll().length, 0);
});

// =============================================================================
// Tests: update function
// =============================================================================

test("update changes line state", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line = ui.progress.add("state-test", "Initial");
  assert.strictEqual(line.state, "processing");

  ui.progress.update(line, { state: "done" });
  assert.strictEqual(line.state, "done");
});

test("update changes state and message", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line = ui.progress.add("state-msg-test", "Initial");

  ui.progress.update(line, { state: "failed", message: "Failed!" });
  assert.strictEqual(line.state, "failed");
  assert.strictEqual(line.message, "Failed!");
});

test("update sets progress value", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line = ui.progress.add("progress-test", "Working");
  assert.strictEqual(line.progressBar, undefined);

  ui.progress.update(line, { progressBar: 0.5, message: "Halfway" });
  assert.strictEqual(line.progressBar, 0.5);
  assert.strictEqual(line.message, "Halfway");
});

test("update with undefined progressBar hides progress bar", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line = ui.progress.add("progress-hide-test", "Working");
  ui.progress.update(line, { progressBar: 0.5 });
  assert.strictEqual(line.progressBar, 0.5);

  ui.progress.update(line, { progressBar: undefined });
  assert.strictEqual(line.progressBar, undefined);
});

test("update can change all fields at once", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line = ui.progress.add("full-update-test", "Initial");

  ui.progress.update(line, {
    state: "done",
    message: "Complete",
    progressBar: 1,
  });
  assert.strictEqual(line.state, "done");
  assert.strictEqual(line.message, "Complete");
  assert.strictEqual(line.progressBar, 1);
});

// =============================================================================
// Tests: formatLineText
// =============================================================================

test("formatLineText: TTY mode uses icons", () => {
  const line: ProgressLine = {
    id: "fmt-test",
    message: "Test",
    state: "done",
    indent: 0,
  };
  const result = ui.progress.format(line, true) as string;
  assert.ok(stripAnsi(result).includes("✓"), "should include checkmark icon");
  assert.ok(result.includes("Test"), "should include message");
});

test("formatLineText: non-TTY mode uses text markers", () => {
  const line: ProgressLine = {
    id: "fmt-test",
    message: "Test",
    state: "done",
    indent: 0,
  };
  const result = ui.progress.format(line, false) as string;
  assert.ok(result.includes("[OK]"), "should include [OK] marker");
  assert.ok(result.includes("[fmt-test]"), "should include line ID");
  assert.ok(result.includes("Test"), "should include message");
});

test("formatLineText: all states produce output in TTY mode", () => {
  const states: ProgressState[] = [
    "pending",
    "processing",
    "done",
    "warn",
    "failed",
  ];
  for (const state of states) {
    const line: ProgressLine = {
      id: "state-test",
      message: "msg",
      state,
      indent: 0,
    };
    const result = ui.progress.format(line, true) as string;
    assert.ok(result.includes("msg"), `state ${state} should include message`);
  }
});

test("formatLineText: all states produce output in non-TTY mode", () => {
  const states: ProgressState[] = [
    "pending",
    "processing",
    "done",
    "warn",
    "failed",
  ];
  const expectedMarkers: Record<ProgressState, string> = {
    pending: "-",
    processing: "*",
    done: "[OK]",
    warn: "[WARN]",
    failed: "[FAIL]",
  };
  for (const state of states) {
    const line: ProgressLine = {
      id: "state-test",
      message: "msg",
      state,
      indent: 0,
    };
    const result = ui.progress.format(line, false) as string;
    assert.ok(
      result.includes(expectedMarkers[state]),
      `state ${state} should include ${expectedMarkers[state]}`
    );
  }
});

test("formatLineText: includes progress bar when set", () => {
  const line: ProgressLine = {
    id: "bar-test",
    message: "Working",
    state: "processing",
    indent: 0,
    progressBar: 0.5,
  };

  const ttyResult = ui.progress.format(line, true) as string;
  assert.ok(
    ttyResult.includes("[██▌__]"),
    "TTY should show visual progress bar"
  );

  const nonTtyResult = ui.progress.format(line, false) as string;
  assert.ok(nonTtyResult.includes("[50%]"), "non-TTY should show percentage");
});

test("formatLineText: respects indent", () => {
  const line: ProgressLine = {
    id: "indent-test",
    message: "Indented",
    state: "done",
    indent: 4,
  };
  const result = ui.progress.format(line, false) as string;
  assert.ok(result.startsWith("    "), "should start with 4 spaces");
});

// =============================================================================
// Tests: Lifecycle (start/stop)
// =============================================================================

test("start returns a disposable", () => {
  using _tty = ui.withTTY(false);
  const session = ui.progress.start();
  assert.ok(Symbol.dispose in session, "should have Symbol.dispose");
  ui.progress.stop();
});

test("start disposable calls stop on dispose", () => {
  using _tty = ui.withTTY(false);
  {
    using _session = ui.progress.start();
    ui.progress.add("dispose-test", "Test");
    assert.strictEqual(ui.progress.getAll().length, 1);
  }
  // After dispose, lines should be cleared
  assert.strictEqual(ui.progress.getAll().length, 0);
});

test("multiple start calls are safe", () => {
  using _tty = ui.withTTY(false);
  using _session1 = ui.progress.start();
  const session2 = ui.progress.start(); // should return no-op disposable

  ui.progress.add("multi-start", "Test");
  assert.strictEqual(ui.progress.getAll().length, 1);

  // Disposing session2 should be a no-op
  session2[Symbol.dispose]();
  assert.strictEqual(ui.progress.getAll().length, 1);
});

test("stop without start is safe", () => {
  using _tty = ui.withTTY(false);
  // Should not throw
  ui.progress.stop();
  ui.progress.stop();
});

// =============================================================================
// Tests: Suspend/Resume
// =============================================================================

test("suspend returns a disposable", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const paused = ui.progress.suspend();
  assert.ok(Symbol.dispose in paused, "should have Symbol.dispose");
  ui.progress.resume();
});

test("suspend disposable calls resume on dispose", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  // This should not throw - the dispose will call resume
  {
    using _paused = ui.progress.suspend();
  }
});

test("suspend/resume can be nested", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  {
    using _outer = ui.progress.suspend();
    {
      using _inner = ui.progress.suspend();
    }
  }
  // Should complete without error
});

test("resume without suspend throws", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  assert.throws(() => {
    ui.progress.resume();
  }, /without matching suspend/);
});

// =============================================================================
// Tests: getLines
// =============================================================================

test("getLines returns readonly array with correct indices", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line1 = ui.progress.add("idx-1", "First");
  const line2 = ui.progress.add("idx-2", "Second");
  const line3 = ui.progress.add("idx-3", "Third");

  const lines = ui.progress.getAll();
  assert.strictEqual(lines.length, 3);
  assert.strictEqual(lines.indexOf(line1), 0);
  assert.strictEqual(lines.indexOf(line2), 1);
  assert.strictEqual(lines.indexOf(line3), 2);
});

test("getLines returns -1 for unknown line", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const unknownLine: ProgressLine = {
    id: "unknown",
    message: "msg",
    state: "done",
    indent: 0,
  };
  assert.strictEqual(ui.progress.getAll().indexOf(unknownLine), -1);
});

// =============================================================================
// Tests: insertLineAfter with null
// =============================================================================

test("insertLineAfter with null inserts at beginning", () => {
  using _tty = ui.withTTY(false);
  using _session = ui.progress.start();

  const line2 = ui.progress.add("second", "Second");
  const line3 = ui.progress.add("third", "Third");
  const line1 = ui.progress.insertAfter(null, "first", "First");

  assert.strictEqual(ui.progress.getAll().indexOf(line1), 0);
  assert.strictEqual(ui.progress.getAll().indexOf(line2), 1);
  assert.strictEqual(ui.progress.getAll().indexOf(line3), 2);
});
