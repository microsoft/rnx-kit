// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Tests for modules/merge-hunks.ts module.
 *
 * Run with: node --test scripts/tests/merge-hunks.test.ts
 */

import assert from "node:assert";
import { test } from "node:test";
import type { ParseSuccess } from "../src/modules/merge-hunks.ts";
import {
  applyResolved,
  coalesceHunks,
  extractLines,
  getHunkToMerge,
  getResolved,
  parseConflictedFile,
} from "../src/modules/merge-hunks.ts";

// =============================================================================
// Test 1: Simple conflict with all sections
// =============================================================================

test("simple conflict with all sections", () => {
  const input = [
    "normal line 1",
    "<<<<<<< LOCAL",
    "local change",
    "||||||| BASE",
    "base content",
    "=======",
    "remote change",
    ">>>>>>> REMOTE",
    "normal line 2",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);

  const success = result as ParseSuccess;

  // Check reconstructed files
  assert.deepStrictEqual(success.info.localLines, [
    "normal line 1",
    "local change",
    "normal line 2",
  ]);
  assert.deepStrictEqual(success.info.baseLines, [
    "normal line 1",
    "base content",
    "normal line 2",
  ]);
  assert.deepStrictEqual(success.info.remoteLines, [
    "normal line 1",
    "remote change",
    "normal line 2",
  ]);

  // Check hunk info
  assert.strictEqual(success.info.hunks.length, 1);
  const hunk = success.info.hunks[0];

  assert.strictEqual(hunk.index, 0);
  assert.deepStrictEqual(hunk.mergedSpan, { start: 1, count: 7 });
  assert.deepStrictEqual(hunk.localSpan, { start: 1, count: 1 });
  assert.deepStrictEqual(hunk.baseSpan, { start: 1, count: 1 });
  assert.deepStrictEqual(hunk.remoteSpan, { start: 1, count: 1 });

  // Use extractLines to get content from reconstructed files
  assert.deepStrictEqual(
    extractLines(success.info.localLines, hunk.localSpan),
    ["local change"]
  );
  assert.deepStrictEqual(
    extractLines(success.info.baseLines!, hunk.baseSpan!),
    ["base content"]
  );
  assert.deepStrictEqual(
    extractLines(success.info.remoteLines, hunk.remoteSpan),
    ["remote change"]
  );
});

// =============================================================================
// Test 2: Conflict without ||||||| marker (no base)
// =============================================================================

test("conflict without base marker", () => {
  const input = [
    "prefix",
    "<<<<<<< HEAD",
    "added by local",
    "=======",
    "added by remote",
    ">>>>>>> branch",
    "suffix",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);

  const success = result as ParseSuccess;

  // baseLines should be null when no ||||||| markers exist
  assert.strictEqual(success.info.baseLines, null);

  // local and remote should have their content
  assert.deepStrictEqual(success.info.localLines, [
    "prefix",
    "added by local",
    "suffix",
  ]);
  assert.deepStrictEqual(success.info.remoteLines, [
    "prefix",
    "added by remote",
    "suffix",
  ]);

  // Check hunk
  assert.strictEqual(success.info.hunks.length, 1);
  const hunk = success.info.hunks[0];

  assert.strictEqual(hunk.baseSpan, null);
  // When baseSpan is null, we can't extract base lines
  assert.deepStrictEqual(
    extractLines(success.info.localLines, hunk.localSpan),
    ["added by local"]
  );
  assert.deepStrictEqual(
    extractLines(success.info.remoteLines, hunk.remoteSpan),
    ["added by remote"]
  );
});

// =============================================================================
// Test 3: Conflict with empty base section
// =============================================================================

test("conflict with empty base section", () => {
  const input = [
    "before",
    "<<<<<<< LOCAL",
    "local addition",
    "||||||| abc123",
    "=======",
    "remote addition",
    ">>>>>>> REMOTE",
    "after",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);

  const success = result as ParseSuccess;

  // baseLines should be an empty array (not null) when ||||||| exists but is empty
  assert.notStrictEqual(success.info.baseLines, null);
  assert.deepStrictEqual(success.info.baseLines, ["before", "after"]);

  assert.deepStrictEqual(success.info.localLines, [
    "before",
    "local addition",
    "after",
  ]);
  assert.deepStrictEqual(success.info.remoteLines, [
    "before",
    "remote addition",
    "after",
  ]);

  // Check hunk - baseSpan should have count 0
  const hunk = success.info.hunks[0];
  assert.deepStrictEqual(hunk.baseSpan, { start: 1, count: 0 });
  assert.deepStrictEqual(
    extractLines(success.info.baseLines!, hunk.baseSpan!),
    []
  );
});

// =============================================================================
// Test 4: Multiple conflicts
// =============================================================================

test("multiple conflicts", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local1",
    "||||||| BASE",
    "base1",
    "=======",
    "remote1",
    ">>>>>>> REMOTE",
    "middle",
    "<<<<<<< LOCAL",
    "local2",
    "||||||| BASE",
    "base2",
    "=======",
    "remote2",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);

  const success = result as ParseSuccess;

  // Check reconstructed files
  assert.deepStrictEqual(success.info.localLines, [
    "header",
    "local1",
    "middle",
    "local2",
    "footer",
  ]);
  assert.deepStrictEqual(success.info.baseLines, [
    "header",
    "base1",
    "middle",
    "base2",
    "footer",
  ]);
  assert.deepStrictEqual(success.info.remoteLines, [
    "header",
    "remote1",
    "middle",
    "remote2",
    "footer",
  ]);

  // Check two hunks
  assert.strictEqual(success.info.hunks.length, 2);

  // First hunk
  assert.strictEqual(success.info.hunks[0].index, 0);
  assert.deepStrictEqual(success.info.hunks[0].mergedSpan, {
    start: 1,
    count: 7,
  });
  assert.deepStrictEqual(success.info.hunks[0].localSpan, {
    start: 1,
    count: 1,
  });

  // Second hunk
  assert.strictEqual(success.info.hunks[1].index, 1);
  assert.deepStrictEqual(success.info.hunks[1].mergedSpan, {
    start: 9,
    count: 7,
  });
  assert.deepStrictEqual(success.info.hunks[1].localSpan, {
    start: 3,
    count: 1,
  });
});

// =============================================================================
// Test 5: Conflict at file start
// =============================================================================

test("conflict at file start", () => {
  const input = [
    "<<<<<<< LOCAL",
    "local content",
    "||||||| BASE",
    "base content",
    "=======",
    "remote content",
    ">>>>>>> REMOTE",
    "rest of file",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);

  const success = result as ParseSuccess;

  // Check spans start at index 0
  const hunk = success.info.hunks[0];
  assert.deepStrictEqual(hunk.mergedSpan, { start: 0, count: 7 });
  assert.deepStrictEqual(hunk.localSpan, { start: 0, count: 1 });
  assert.deepStrictEqual(hunk.baseSpan, { start: 0, count: 1 });
  assert.deepStrictEqual(hunk.remoteSpan, { start: 0, count: 1 });

  // Check reconstructed files
  assert.deepStrictEqual(success.info.localLines, [
    "local content",
    "rest of file",
  ]);
  assert.deepStrictEqual(success.info.baseLines, [
    "base content",
    "rest of file",
  ]);
  assert.deepStrictEqual(success.info.remoteLines, [
    "remote content",
    "rest of file",
  ]);
});

// =============================================================================
// Test 6: Conflict at file end
// =============================================================================

test("conflict at file end", () => {
  const input = [
    "start of file",
    "<<<<<<< LOCAL",
    "local ending",
    "||||||| BASE",
    "base ending",
    "=======",
    "remote ending",
    ">>>>>>> REMOTE",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);

  const success = result as ParseSuccess;

  // Check reconstructed files end correctly
  assert.deepStrictEqual(success.info.localLines, [
    "start of file",
    "local ending",
  ]);
  assert.deepStrictEqual(success.info.baseLines, [
    "start of file",
    "base ending",
  ]);
  assert.deepStrictEqual(success.info.remoteLines, [
    "start of file",
    "remote ending",
  ]);
});

// =============================================================================
// Test 7: Multi-line content in each section
// =============================================================================

test("multi-line content in each section", () => {
  const input = [
    "before",
    "<<<<<<< LOCAL",
    "local line 1",
    "local line 2",
    "local line 3",
    "||||||| BASE",
    "base line 1",
    "base line 2",
    "=======",
    "remote line 1",
    "remote line 2",
    "remote line 3",
    "remote line 4",
    ">>>>>>> REMOTE",
    "after",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);

  const success = result as ParseSuccess;

  // Check hunk line counts
  const hunk = success.info.hunks[0];
  assert.strictEqual(hunk.localSpan.count, 3);
  assert.strictEqual(hunk.baseSpan?.count, 2);
  assert.strictEqual(hunk.remoteSpan.count, 4);

  // Check content using extractLines
  assert.deepStrictEqual(
    extractLines(success.info.localLines, hunk.localSpan),
    ["local line 1", "local line 2", "local line 3"]
  );
  assert.deepStrictEqual(
    extractLines(success.info.baseLines!, hunk.baseSpan!),
    ["base line 1", "base line 2"]
  );
  assert.deepStrictEqual(
    extractLines(success.info.remoteLines, hunk.remoteSpan),
    ["remote line 1", "remote line 2", "remote line 3", "remote line 4"]
  );

  // Merged span should include all markers and content
  assert.strictEqual(hunk.mergedSpan.count, 13); // 1 + 3 + 1 + 2 + 1 + 4 + 1 = 13
});

// =============================================================================
// Test 8: No conflicts found (error case)
// =============================================================================

test("no conflicts found returns error", () => {
  const input = ["just a normal file", "with no conflict markers", "at all"];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, false);

  if (!result.success) {
    assert.ok(result.error.includes("No conflict markers"));
  }
});

// =============================================================================
// Test 9: Real-world example (configure.py style)
// =============================================================================

test("real-world configure.py example", () => {
  const input = [
    "    help='compile shared library...')",
    "",
    "<<<<<<< HEAD",
    "parser.add_argument('--build-hermes',",
    "    action='store_true',",
    "    dest='build_hermes',",
    "    default=None,",
    "    help='build hermes shared library')",
    "",
    "||||||| 0f15923583",
    "=======",
    "parser.add_argument('--build-v8jsi',",
    "    action='store_true',",
    "    dest='build_v8jsi',",
    "    default=None,",
    "    help='build v8jsi shared library')",
    "",
    ">>>>>>> current_20260120_165446",
    "parser.add_argument('--libdir',",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);

  const success = result as ParseSuccess;

  // baseLines should be present but without the conflict content (it was empty)
  assert.notStrictEqual(success.info.baseLines, null);
  assert.deepStrictEqual(success.info.baseLines, [
    "    help='compile shared library...')",
    "",
    "parser.add_argument('--libdir',",
  ]);

  // localLines should have the hermes block
  assert.deepStrictEqual(success.info.localLines, [
    "    help='compile shared library...')",
    "",
    "parser.add_argument('--build-hermes',",
    "    action='store_true',",
    "    dest='build_hermes',",
    "    default=None,",
    "    help='build hermes shared library')",
    "",
    "parser.add_argument('--libdir',",
  ]);

  // remoteLines should have the v8jsi block
  assert.deepStrictEqual(success.info.remoteLines, [
    "    help='compile shared library...')",
    "",
    "parser.add_argument('--build-v8jsi',",
    "    action='store_true',",
    "    dest='build_v8jsi',",
    "    default=None,",
    "    help='build v8jsi shared library')",
    "",
    "parser.add_argument('--libdir',",
  ]);

  // Check hunk details
  const hunk = success.info.hunks[0];
  assert.strictEqual(hunk.localSpan.count, 6); // 5 lines + empty line
  assert.strictEqual(hunk.baseSpan?.count, 0); // Empty base
  assert.strictEqual(hunk.remoteSpan.count, 6); // 5 lines + empty line
});

// =============================================================================
// Test 10: Empty input
// =============================================================================

test("empty input returns error", () => {
  const result = parseConflictedFile([]);
  assert.strictEqual(result.success, false);

  if (!result.success) {
    assert.ok(result.error.includes("No conflict markers"));
  }
});

// =============================================================================
// Test 11: Mixed hunks - some with base, some without
// =============================================================================

test("mixed hunks with and without base", () => {
  const input = [
    "start",
    "<<<<<<< LOCAL",
    "local1",
    "||||||| BASE",
    "base1",
    "=======",
    "remote1",
    ">>>>>>> REMOTE",
    "middle",
    "<<<<<<< LOCAL",
    "local2",
    "=======",
    "remote2",
    ">>>>>>> REMOTE",
    "end",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);

  const success = result as ParseSuccess;

  // Since at least one hunk has base, baseLines should not be null
  assert.notStrictEqual(success.info.baseLines, null);

  // First hunk has base, second doesn't
  assert.notStrictEqual(success.info.hunks[0].baseSpan, null);
  assert.strictEqual(success.info.hunks[1].baseSpan, null);

  // Check reconstructed base - it should have base1 from first hunk
  // but nothing from second hunk (since no base marker)
  assert.deepStrictEqual(success.info.baseLines, [
    "start",
    "base1",
    "middle",
    "end",
  ]);
});

// =============================================================================
// Coalescing Tests
// =============================================================================

// =============================================================================
// Coalesce Test 1: No coalescing needed (hunks far apart)
// =============================================================================

test("coalesce: no coalescing when hunks far apart", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local1",
    "||||||| BASE",
    "base1",
    "=======",
    "remote1",
    ">>>>>>> REMOTE",
    "gap line 1",
    "gap line 2",
    "gap line 3",
    "gap line 4",
    "gap line 5",
    "<<<<<<< LOCAL",
    "local2",
    "||||||| BASE",
    "base2",
    "=======",
    "remote2",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const success = result as ParseSuccess;

  // With threshold 3, hunks 5 lines apart should NOT coalesce
  const coalesced = coalesceHunks(success.info.hunks, 3);
  assert.strictEqual(coalesced.length, 2);
  assert.strictEqual(coalesced[0].index, 0);
  assert.strictEqual(coalesced[1].index, 1);
});

// =============================================================================
// Coalesce Test 2: Two adjacent hunks (distance = 0)
// =============================================================================

test("coalesce: two adjacent hunks", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local1",
    "||||||| BASE",
    "base1",
    "=======",
    "remote1",
    ">>>>>>> REMOTE",
    "<<<<<<< LOCAL",
    "local2",
    "||||||| BASE",
    "base2",
    "=======",
    "remote2",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const success = result as ParseSuccess;

  // Adjacent hunks (distance = 0) should coalesce with threshold 0
  const coalesced = coalesceHunks(success.info.hunks, 0);
  assert.strictEqual(coalesced.length, 1);
  assert.strictEqual(coalesced[0].index, 0);

  // Merged span should cover both hunks
  assert.strictEqual(coalesced[0].mergedSpan.start, 1);
  assert.strictEqual(coalesced[0].mergedSpan.count, 14); // Both hunks

  // Local span should cover both local sections
  assert.deepStrictEqual(
    extractLines(success.info.localLines, coalesced[0].localSpan),
    ["local1", "local2"]
  );
});

// =============================================================================
// Coalesce Test 3: Two hunks within threshold
// =============================================================================

test("coalesce: two hunks within threshold", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local1",
    "||||||| BASE",
    "base1",
    "=======",
    "remote1",
    ">>>>>>> REMOTE",
    "gap1",
    "gap2",
    "gap3",
    "<<<<<<< LOCAL",
    "local2",
    "||||||| BASE",
    "base2",
    "=======",
    "remote2",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const success = result as ParseSuccess;

  // With threshold 5, hunks 3 lines apart should coalesce
  const coalesced = coalesceHunks(success.info.hunks, 5);
  assert.strictEqual(coalesced.length, 1);

  // Coalesced local span should include gap lines
  assert.deepStrictEqual(
    extractLines(success.info.localLines, coalesced[0].localSpan),
    ["local1", "gap1", "gap2", "gap3", "local2"]
  );
});

// =============================================================================
// Coalesce Test 4: Three hunks coalesced
// =============================================================================

test("coalesce: three hunks into one", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local1",
    "||||||| BASE",
    "base1",
    "=======",
    "remote1",
    ">>>>>>> REMOTE",
    "gap1",
    "<<<<<<< LOCAL",
    "local2",
    "||||||| BASE",
    "base2",
    "=======",
    "remote2",
    ">>>>>>> REMOTE",
    "gap2",
    "<<<<<<< LOCAL",
    "local3",
    "||||||| BASE",
    "base3",
    "=======",
    "remote3",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const success = result as ParseSuccess;

  assert.strictEqual(success.info.hunks.length, 3);

  // With threshold 2, all three should coalesce
  const coalesced = coalesceHunks(success.info.hunks, 2);
  assert.strictEqual(coalesced.length, 1);
  assert.strictEqual(coalesced[0].index, 0);
});

// =============================================================================
// Coalesce Test 5: Multiple groups
// =============================================================================

test("coalesce: multiple groups", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local1",
    "||||||| BASE",
    "base1",
    "=======",
    "remote1",
    ">>>>>>> REMOTE",
    "gap1", // 1 line gap - will coalesce with threshold 2
    "<<<<<<< LOCAL",
    "local2",
    "||||||| BASE",
    "base2",
    "=======",
    "remote2",
    ">>>>>>> REMOTE",
    "big gap 1",
    "big gap 2",
    "big gap 3",
    "big gap 4",
    "big gap 5", // 5 line gap - will NOT coalesce with threshold 2
    "<<<<<<< LOCAL",
    "local3",
    "||||||| BASE",
    "base3",
    "=======",
    "remote3",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const success = result as ParseSuccess;

  assert.strictEqual(success.info.hunks.length, 3);

  // With threshold 2: hunks 0,1 coalesce; hunk 2 separate
  const coalesced = coalesceHunks(success.info.hunks, 2);
  assert.strictEqual(coalesced.length, 2);
  assert.strictEqual(coalesced[0].index, 0);
  assert.strictEqual(coalesced[1].index, 1);

  // First coalesced hunk should have 2 original hunks worth of content
  assert.deepStrictEqual(
    extractLines(success.info.localLines, coalesced[0].localSpan),
    ["local1", "gap1", "local2"]
  );

  // Second hunk should just be local3
  assert.deepStrictEqual(
    extractLines(success.info.localLines, coalesced[1].localSpan),
    ["local3"]
  );
});

// =============================================================================
// Coalesce Test 6: Single hunk unchanged
// =============================================================================

test("coalesce: single hunk returns unchanged", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local1",
    "||||||| BASE",
    "base1",
    "=======",
    "remote1",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const success = result as ParseSuccess;

  const coalesced = coalesceHunks(success.info.hunks, 5);
  assert.strictEqual(coalesced.length, 1);
  assert.deepStrictEqual(
    coalesced[0].mergedSpan,
    success.info.hunks[0].mergedSpan
  );
});

// =============================================================================
// Coalesce Test 7: Empty array
// =============================================================================

test("coalesce: empty array returns empty", () => {
  const coalesced = coalesceHunks([], 5);
  assert.strictEqual(coalesced.length, 0);
});

// =============================================================================
// Coalesce Test 8: Mixed base presence
// =============================================================================

test("coalesce: mixed base presence sets baseSpan to null", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local1",
    "||||||| BASE",
    "base1",
    "=======",
    "remote1",
    ">>>>>>> REMOTE",
    "gap",
    "<<<<<<< LOCAL",
    "local2",
    "=======",
    "remote2",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const success = result as ParseSuccess;

  // First hunk has base, second doesn't
  assert.notStrictEqual(success.info.hunks[0].baseSpan, null);
  assert.strictEqual(success.info.hunks[1].baseSpan, null);

  // After coalescing, baseSpan should be null (since not all hunks have it)
  const coalesced = coalesceHunks(success.info.hunks, 2);
  assert.strictEqual(coalesced.length, 1);
  assert.strictEqual(coalesced[0].baseSpan, null);
});

// =============================================================================
// Coalesce Test 9: Real-world split example
// =============================================================================

test("coalesce: real-world split hunks example", () => {
  // This mimics the case where git splits a logical conflict into multiple hunks
  const input = [
    "parser.add_argument('--other',",
    "<<<<<<< HEAD",
    "parser.add_argument('--build-hermes',",
    "||||||| BASE",
    "=======",
    "parser.add_argument('--build-v8jsi',",
    ">>>>>>> REMOTE",
    "    action='store_true',",
    "<<<<<<< HEAD",
    "    dest='build_hermes',",
    "||||||| BASE",
    "=======",
    "    dest='build_v8jsi',",
    ">>>>>>> REMOTE",
    "    default=None,",
    "<<<<<<< HEAD",
    "    help='build hermes shared library')",
    "||||||| BASE",
    "=======",
    "    help='build v8jsi shared library')",
    ">>>>>>> REMOTE",
    "",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const success = result as ParseSuccess;

  // Should have 3 hunks
  assert.strictEqual(success.info.hunks.length, 3);

  // Coalesce with threshold 2 (1 line gaps between hunks)
  const coalesced = coalesceHunks(success.info.hunks, 2);
  assert.strictEqual(coalesced.length, 1);

  // The coalesced hunk should span all content
  const localContent = extractLines(
    success.info.localLines,
    coalesced[0].localSpan
  );
  assert.deepStrictEqual(localContent, [
    "parser.add_argument('--build-hermes',",
    "    action='store_true',",
    "    dest='build_hermes',",
    "    default=None,",
    "    help='build hermes shared library')",
  ]);

  const remoteContent = extractLines(
    success.info.remoteLines,
    coalesced[0].remoteSpan
  );
  assert.deepStrictEqual(remoteContent, [
    "parser.add_argument('--build-v8jsi',",
    "    action='store_true',",
    "    dest='build_v8jsi',",
    "    default=None,",
    "    help='build v8jsi shared library')",
  ]);
});

// =============================================================================
// getHunkToMerge Tests
// =============================================================================

// =============================================================================
// getHunkToMerge Test 1: Basic hunk with full context
// =============================================================================

test("getHunkToMerge: basic hunk with full context", () => {
  const input = [
    "line 1",
    "line 2",
    "line 3",
    "<<<<<<< LOCAL",
    "local content",
    "||||||| BASE",
    "base content",
    "=======",
    "remote content",
    ">>>>>>> REMOTE",
    "line 4",
    "line 5",
    "line 6",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  const hunkToMerge = getHunkToMerge(info, 0, 2);

  assert.deepStrictEqual(hunkToMerge, [
    "line 2",
    "line 3",
    "<<<<<<< LOCAL",
    "local content",
    "||||||| BASE",
    "base content",
    "=======",
    "remote content",
    ">>>>>>> REMOTE",
    "line 4",
    "line 5",
  ]);
});

// =============================================================================
// getHunkToMerge Test 2: Hunk at file start
// =============================================================================

test("getHunkToMerge: hunk at file start (reduced context before)", () => {
  const input = [
    "<<<<<<< LOCAL",
    "local content",
    "||||||| BASE",
    "base content",
    "=======",
    "remote content",
    ">>>>>>> REMOTE",
    "after 1",
    "after 2",
    "after 3",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  const hunkToMerge = getHunkToMerge(info, 0, 3);

  // No context before (hunk at start), 3 lines after
  assert.deepStrictEqual(hunkToMerge, [
    "<<<<<<< LOCAL",
    "local content",
    "||||||| BASE",
    "base content",
    "=======",
    "remote content",
    ">>>>>>> REMOTE",
    "after 1",
    "after 2",
    "after 3",
  ]);
});

// =============================================================================
// getHunkToMerge Test 3: Hunk at file end
// =============================================================================

test("getHunkToMerge: hunk at file end (reduced context after)", () => {
  const input = [
    "before 1",
    "before 2",
    "before 3",
    "<<<<<<< LOCAL",
    "local content",
    "||||||| BASE",
    "base content",
    "=======",
    "remote content",
    ">>>>>>> REMOTE",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  const hunkToMerge = getHunkToMerge(info, 0, 3);

  // 3 lines before, no context after (hunk at end)
  assert.deepStrictEqual(hunkToMerge, [
    "before 1",
    "before 2",
    "before 3",
    "<<<<<<< LOCAL",
    "local content",
    "||||||| BASE",
    "base content",
    "=======",
    "remote content",
    ">>>>>>> REMOTE",
  ]);
});

// =============================================================================
// getHunkToMerge Test 4: Hunk with no base
// =============================================================================

test("getHunkToMerge: hunk with no base marker", () => {
  const input = [
    "before",
    "<<<<<<< LOCAL",
    "local content",
    "=======",
    "remote content",
    ">>>>>>> REMOTE",
    "after",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  const hunkToMerge = getHunkToMerge(info, 0, 1);

  // No ||||||| BASE marker in output
  assert.deepStrictEqual(hunkToMerge, [
    "before",
    "<<<<<<< LOCAL",
    "local content",
    "=======",
    "remote content",
    ">>>>>>> REMOTE",
    "after",
  ]);
});

// =============================================================================
// getHunkToMerge Test 5: Zero context lines
// =============================================================================

test("getHunkToMerge: zero context lines", () => {
  const input = [
    "before",
    "<<<<<<< LOCAL",
    "local content",
    "||||||| BASE",
    "base content",
    "=======",
    "remote content",
    ">>>>>>> REMOTE",
    "after",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  const hunkToMerge = getHunkToMerge(info, 0, 0);

  // Just conflict markers and content, no context
  assert.deepStrictEqual(hunkToMerge, [
    "<<<<<<< LOCAL",
    "local content",
    "||||||| BASE",
    "base content",
    "=======",
    "remote content",
    ">>>>>>> REMOTE",
  ]);
});

// =============================================================================
// getHunkToMerge Test 6: Context larger than available
// =============================================================================

test("getHunkToMerge: context larger than available caps at file boundaries", () => {
  const input = [
    "before",
    "<<<<<<< LOCAL",
    "local",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
    "after",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // Request 10 lines but only 1 available each side
  const hunkToMerge = getHunkToMerge(info, 0, 10);

  assert.deepStrictEqual(hunkToMerge, [
    "before",
    "<<<<<<< LOCAL",
    "local",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
    "after",
  ]);
});

// =============================================================================
// getHunkToMerge Test 7: Multi-line content
// =============================================================================

test("getHunkToMerge: multi-line content in each section", () => {
  const input = [
    "ctx1",
    "ctx2",
    "<<<<<<< LOCAL",
    "local1",
    "local2",
    "||||||| BASE",
    "base1",
    "=======",
    "remote1",
    "remote2",
    "remote3",
    ">>>>>>> REMOTE",
    "ctx3",
    "ctx4",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  const hunkToMerge = getHunkToMerge(info, 0, 2);

  assert.deepStrictEqual(hunkToMerge, [
    "ctx1",
    "ctx2",
    "<<<<<<< LOCAL",
    "local1",
    "local2",
    "||||||| BASE",
    "base1",
    "=======",
    "remote1",
    "remote2",
    "remote3",
    ">>>>>>> REMOTE",
    "ctx3",
    "ctx4",
  ]);
});

// =============================================================================
// applyResolved Tests
// =============================================================================

// =============================================================================
// applyResolved Test 1: Valid resolution with full context
// =============================================================================

test("applyResolved: valid resolution with full context", () => {
  const input = [
    "before1",
    "before2",
    "<<<<<<< LOCAL",
    "local",
    "||||||| BASE",
    "base",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
    "after1",
    "after2",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // Simulate AI resolution with context preserved
  const resolved = [
    "before1",
    "before2",
    "merged content line 1",
    "merged content line 2",
    "after1",
    "after2",
  ];

  const applyResult = applyResolved(info, 0, 2, resolved);

  assert.strictEqual(applyResult.success, true);
  assert.deepStrictEqual(info.hunks[0].resolved, [
    "merged content line 1",
    "merged content line 2",
  ]);
});

// =============================================================================
// applyResolved Test 2: Valid resolution at file start
// =============================================================================

test("applyResolved: valid resolution at file start", () => {
  const input = [
    "<<<<<<< LOCAL",
    "local",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
    "after1",
    "after2",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // No context before, 2 after
  const resolved = ["merged", "after1", "after2"];

  const applyResult = applyResolved(info, 0, 2, resolved);

  assert.strictEqual(applyResult.success, true);
  assert.deepStrictEqual(info.hunks[0].resolved, ["merged"]);
});

// =============================================================================
// applyResolved Test 3: Valid resolution at file end
// =============================================================================

test("applyResolved: valid resolution at file end", () => {
  const input = [
    "before1",
    "before2",
    "<<<<<<< LOCAL",
    "local",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // 2 context before, none after
  const resolved = ["before1", "before2", "merged"];

  const applyResult = applyResolved(info, 0, 2, resolved);

  assert.strictEqual(applyResult.success, true);
  assert.deepStrictEqual(info.hunks[0].resolved, ["merged"]);
});

// =============================================================================
// applyResolved Test 4: Context before mismatch
// =============================================================================

test("applyResolved: context before mismatch returns error", () => {
  const input = [
    "before1",
    "before2",
    "<<<<<<< LOCAL",
    "local",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
    "after",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // Wrong context before
  const resolved = ["wrong1", "before2", "merged", "after"];

  const applyResult = applyResolved(info, 0, 2, resolved);

  assert.strictEqual(applyResult.success, false);
  assert.ok(applyResult.error?.includes("Context before mismatch"));
});

// =============================================================================
// applyResolved Test 5: Context after mismatch
// =============================================================================

test("applyResolved: context after mismatch returns error", () => {
  const input = [
    "before",
    "<<<<<<< LOCAL",
    "local",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
    "after1",
    "after2",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // Wrong context after
  const resolved = ["before", "merged", "after1", "wrong2"];

  const applyResult = applyResolved(info, 0, 2, resolved);

  assert.strictEqual(applyResult.success, false);
  assert.ok(applyResult.error?.includes("Context after mismatch"));
});

// =============================================================================
// applyResolved Test 6: Zero context lines
// =============================================================================

test("applyResolved: zero context lines stores all as resolved", () => {
  const input = [
    "before",
    "<<<<<<< LOCAL",
    "local",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
    "after",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // No context - entire input is resolved content
  const resolved = ["line1", "line2", "line3"];

  const applyResult = applyResolved(info, 0, 0, resolved);

  assert.strictEqual(applyResult.success, true);
  assert.deepStrictEqual(info.hunks[0].resolved, ["line1", "line2", "line3"]);
});

// =============================================================================
// applyResolved Test 7: Empty resolved content
// =============================================================================

test("applyResolved: empty resolved content (deletion)", () => {
  const input = [
    "before",
    "<<<<<<< LOCAL",
    "local",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
    "after",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // Resolution deletes the conflicted section
  const resolved = ["before", "after"];

  const applyResult = applyResolved(info, 0, 1, resolved);

  assert.strictEqual(applyResult.success, true);
  assert.deepStrictEqual(info.hunks[0].resolved, []);
});

// =============================================================================
// applyResolved Test 8: Multiple hunks resolved independently
// =============================================================================

test("applyResolved: multiple hunks resolved independently", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local1",
    "=======",
    "remote1",
    ">>>>>>> REMOTE",
    "middle",
    "<<<<<<< LOCAL",
    "local2",
    "=======",
    "remote2",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // Resolve first hunk
  const resolved1 = ["header", "merged1", "middle"];
  const applyResult1 = applyResolved(info, 0, 1, resolved1);
  assert.strictEqual(applyResult1.success, true);
  assert.deepStrictEqual(info.hunks[0].resolved, ["merged1"]);

  // Resolve second hunk
  const resolved2 = ["middle", "merged2", "footer"];
  const applyResult2 = applyResolved(info, 1, 1, resolved2);
  assert.strictEqual(applyResult2.success, true);
  assert.deepStrictEqual(info.hunks[1].resolved, ["merged2"]);
});

// =============================================================================
// Integration Test: Full workflow
// =============================================================================

test("integration: full workflow parse → getHunkToMerge → applyResolved", () => {
  const input = [
    "header",
    "context1",
    "<<<<<<< LOCAL",
    "local content",
    "||||||| BASE",
    "base content",
    "=======",
    "remote content",
    ">>>>>>> REMOTE",
    "context2",
    "footer",
  ];

  // Step 1: Parse
  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // Step 2: Get hunk to merge
  const hunkToMerge = getHunkToMerge(info, 0, 1);
  assert.deepStrictEqual(hunkToMerge, [
    "context1",
    "<<<<<<< LOCAL",
    "local content",
    "||||||| BASE",
    "base content",
    "=======",
    "remote content",
    ">>>>>>> REMOTE",
    "context2",
  ]);

  // Step 3: Simulate AI resolution (combine local and remote)
  const resolved = ["context1", "local content", "remote content", "context2"];

  // Step 4: Apply resolved
  const applyResult = applyResolved(info, 0, 1, resolved);
  assert.strictEqual(applyResult.success, true);
  assert.deepStrictEqual(info.hunks[0].resolved, [
    "local content",
    "remote content",
  ]);
});

// =============================================================================
// getResolved Tests
// =============================================================================

// =============================================================================
// getResolved Test 1: All hunks resolved
// =============================================================================

test("getResolved: all hunks resolved returns resolved content, isComplete = true", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // Resolve the hunk
  info.hunks[0].resolved = ["merged content"];

  const resolved = getResolved(info);

  assert.strictEqual(resolved.isComplete, true);
  assert.deepStrictEqual(resolved.lines, [
    "header",
    "merged content",
    "footer",
  ]);
});

// =============================================================================
// getResolved Test 2: No hunks resolved
// =============================================================================

test("getResolved: no hunks resolved returns original merged content, isComplete = false", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // Don't resolve anything

  const resolved = getResolved(info);

  assert.strictEqual(resolved.isComplete, false);
  // Should return original merged content unchanged
  assert.deepStrictEqual(resolved.lines, input);
});

// =============================================================================
// getResolved Test 3: Some hunks resolved
// =============================================================================

test("getResolved: some hunks resolved returns mixed content, isComplete = false", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local1",
    "=======",
    "remote1",
    ">>>>>>> REMOTE",
    "middle",
    "<<<<<<< LOCAL",
    "local2",
    "=======",
    "remote2",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // Resolve only first hunk
  info.hunks[0].resolved = ["merged1"];

  const resolved = getResolved(info);

  assert.strictEqual(resolved.isComplete, false);
  assert.deepStrictEqual(resolved.lines, [
    "header",
    "merged1",
    "middle",
    "<<<<<<< LOCAL",
    "local2",
    "=======",
    "remote2",
    ">>>>>>> REMOTE",
    "footer",
  ]);
});

// =============================================================================
// getResolved Test 4: Single hunk at file start
// =============================================================================

test("getResolved: single hunk at file start", () => {
  const input = [
    "<<<<<<< LOCAL",
    "local",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
    "after1",
    "after2",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  info.hunks[0].resolved = ["resolved"];

  const resolved = getResolved(info);

  assert.strictEqual(resolved.isComplete, true);
  assert.deepStrictEqual(resolved.lines, ["resolved", "after1", "after2"]);
});

// =============================================================================
// getResolved Test 5: Single hunk at file end
// =============================================================================

test("getResolved: single hunk at file end", () => {
  const input = [
    "before1",
    "before2",
    "<<<<<<< LOCAL",
    "local",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  info.hunks[0].resolved = ["resolved"];

  const resolved = getResolved(info);

  assert.strictEqual(resolved.isComplete, true);
  assert.deepStrictEqual(resolved.lines, ["before1", "before2", "resolved"]);
});

// =============================================================================
// getResolved Test 6: Empty resolved content (deletion)
// =============================================================================

test("getResolved: empty resolved content (deletion)", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local",
    "=======",
    "remote",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // Resolve with empty array (deletion)
  info.hunks[0].resolved = [];

  const resolved = getResolved(info);

  assert.strictEqual(resolved.isComplete, true);
  assert.deepStrictEqual(resolved.lines, ["header", "footer"]);
});

// =============================================================================
// getResolved Test 7: Multiple hunks all resolved
// =============================================================================

test("getResolved: multiple hunks all resolved", () => {
  const input = [
    "header",
    "<<<<<<< LOCAL",
    "local1",
    "=======",
    "remote1",
    ">>>>>>> REMOTE",
    "middle",
    "<<<<<<< LOCAL",
    "local2",
    "=======",
    "remote2",
    ">>>>>>> REMOTE",
    "footer",
  ];

  const result = parseConflictedFile(input);
  assert.strictEqual(result.success, true);
  const { info } = result as ParseSuccess;

  // Resolve both hunks
  info.hunks[0].resolved = ["merged1"];
  info.hunks[1].resolved = ["merged2a", "merged2b"];

  const resolved = getResolved(info);

  assert.strictEqual(resolved.isComplete, true);
  assert.deepStrictEqual(resolved.lines, [
    "header",
    "merged1",
    "middle",
    "merged2a",
    "merged2b",
    "footer",
  ]);
});
