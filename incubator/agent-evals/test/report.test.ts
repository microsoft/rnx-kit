import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { stripVTControlCharacters } from "node:util";
import {
  formatMarkdown,
  formatReport,
  statusOf,
} from "../src/provider/report.ts";
import type { EvalResult } from "../src/provider/report.ts";

function report(results: EvalResult[]): string {
  return stripVTControlCharacters(formatReport(results));
}

describe("formatReport()", () => {
  it("prints passing tests on one line, in test order", () => {
    const results: EvalResult[] = [
      {
        testIdx: 1,
        success: true,
        testCase: { description: "Second" },
        gradingResult: { reason: "Checked a.ts" },
      },
      {
        testIdx: 0,
        success: true,
        testCase: { description: "First", metadata: { id: "first" } },
      },
    ];
    equal(report(results), ["✓ First [first]", "✓ Second"].join("\n"));
  });

  it("prints the reasons of failed assertions in full", () => {
    const results: EvalResult[] = [
      {
        testIdx: 0,
        success: false,
        failureReason: 1,
        testCase: { description: "Checks", metadata: { id: "checks" } },
        gradingResult: {
          reason: "Did not run 'yarn lint' in a",
          componentResults: [
            { pass: false, reason: "Did not run 'yarn lint' in a\nor in b" },
            { pass: true, reason: "Ran: yarn test" },
            { pass: false, reason: "The agent did not ask first." },
          ],
        },
      },
    ];
    equal(
      report(results),
      [
        "✗ Checks [checks]",
        "    Did not run 'yarn lint' in a",
        "    or in b",
        "    The agent did not ask first.",
      ].join("\n")
    );
  });

  it("falls back to the overall reason, the description and the index", () => {
    const results: EvalResult[] = [
      {
        testIdx: 0,
        success: false,
        failureReason: 1,
        description: "From result",
        gradingResult: { reason: "Overall reason" },
      },
      { testIdx: 1, success: false, failureReason: 1 },
    ];
    equal(
      report(results),
      ["✗ From result", "    Overall reason", "✗ Test #2"].join("\n")
    );
  });

  it("prints errors", () => {
    const results: EvalResult[] = [
      {
        testIdx: 0,
        success: false,
        failureReason: 2,
        error: "No Copilot session found",
        testCase: { description: "Audit" },
        gradingResult: null,
      },
    ];
    equal(
      report(results),
      ["! Audit", "    No Copilot session found"].join("\n")
    );
  });
});

const passed: EvalResult = {
  testIdx: 0,
  success: true,
  testCase: { description: "Passes", metadata: { id: "passes" } },
};

const failed: EvalResult = {
  testIdx: 1,
  success: false,
  failureReason: 1,
  testCase: { description: "Fails <b>", metadata: { id: "fails" } },
  gradingResult: {
    componentResults: [
      { pass: false, reason: "Asked @tido64 about #123\n<img src=x>" },
    ],
  },
};

const unchecked: EvalResult = {
  testIdx: 2,
  success: false,
  failureReason: 1,
  testCase: { description: "Grader" },
  gradingResult: {
    componentResults: [
      { pass: false, reason: "No access", metadata: { graderError: true } },
    ],
  },
};

function skipped(testIdx: number): EvalResult {
  return {
    testIdx,
    success: false,
    failureReason: 2,
    error: "Skipped: requires the session log",
    testCase: { description: `Skipped ${testIdx}` },
  };
}

describe("statusOf()", () => {
  it("returns the outcome of a test", () => {
    deepEqual([passed, failed, unchecked, skipped(3)].map(statusOf), [
      "passed",
      "failed",
      "unchecked",
      "skipped",
    ]);
  });

  it("returns `unchecked` for errors other than skips", () => {
    const error = { ...skipped(0), error: "No Copilot session found" };
    equal(statusOf(error), "unchecked");
  });

  it("returns `failed` if any assertion failed on its merits", () => {
    const result: EvalResult = {
      ...unchecked,
      gradingResult: {
        componentResults: [
          { pass: false, reason: "No access", metadata: { graderError: true } },
          { pass: false, reason: "Ran npx tsc" },
        ],
      },
    };
    equal(statusOf(result), "failed");
  });
});

describe("formatMarkdown()", () => {
  it("groups tests by status, failures first, with a summary", () => {
    equal(
      formatMarkdown([skipped(4), passed, skipped(3), unchecked, failed]),
      [
        "❌ 1 failed · ⚠️ 1 not checked · ⏭️ 2 skipped · ✅ 1 passed",
        "",
        "#### ❌ Failed (1)",
        "",
        "- Fails &lt;b&gt; `fails`",
        "  > Asked @&#8203;tido64 about #&#8203;123",
        "  > &lt;img src=x&gt;",
        "",
        "#### ⚠️ Not checked (1)",
        "",
        "- Grader",
        "  > No access",
        "",
        "<details><summary>⏭️ Skipped: need the session log (2)</summary>",
        "",
        "- Skipped 3",
        "- Skipped 4",
        "",
        "> Skipped: requires the session log",
        "",
        "</details>",
        "",
        "<details><summary>✅ Passed (1)</summary>",
        "",
        "- Passes `passes`",
        "",
        "</details>",
      ].join("\n")
    );
  });

  it("omits the summary if all tests have the same status", () => {
    equal(
      formatMarkdown([passed]),
      [
        "<details><summary>✅ Passed (1)</summary>",
        "",
        "- Passes `passes`",
        "",
        "</details>",
      ].join("\n")
    );
  });
});
