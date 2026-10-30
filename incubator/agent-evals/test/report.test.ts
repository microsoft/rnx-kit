import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { stripVTControlCharacters } from "node:util";
import { formatReport } from "../src/provider/report.ts";
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
