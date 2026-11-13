import type { EvalResult } from "@rnx-kit/agent-evals/report";
import { equal, match } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  auditedNoChanges,
  findReport,
  formatComment,
  markFailed,
  MARKER,
} from "../src/report-comment.ts";
import type { Comment } from "../src/report-comment.ts";

const HEAD = "abc123";

const passed: EvalResult = {
  testIdx: 0,
  success: true,
  testCase: { description: "Passes" },
};

const skipped: EvalResult = {
  testIdx: 1,
  success: false,
  failureReason: 2,
  error: "Skipped: requires the session log",
  testCase: { description: "Needs the log" },
};

const WORKFLOW = "github-actions[bot]";

const report = `<!-- agent-evals head=${HEAD} log=yes -->\n### Agent evals`;

function comment(login: string, body: string, id = 1): Comment {
  return { id, login, body };
}

describe("findReport()", () => {
  it("prefers the report by the author", () => {
    const comments = [
      comment(WORKFLOW, report, 1),
      comment("x", report, 2),
      comment("a", "Hi", 3),
      comment("a", report, 4),
      comment("a", report, 5),
    ];

    equal(findReport(comments, "a")?.id, 4);
  });

  it("falls back to the report by the workflow", () => {
    const comments = [comment("x", report, 1), comment(WORKFLOW, report, 2)];

    equal(findReport(comments, "a")?.id, 2);
  });

  it("ignores reports by anyone else", () => {
    equal(findReport([comment("x", report)], "a"), undefined);
  });

  it("accepts the marker only on a line of its own at the start", () => {
    const crlf = report.replaceAll("\n", "\r\n");

    equal(findReport([comment("a", crlf)], "a")?.body, crlf);

    for (const body of [
      `See \`${report}\``,
      `Hi\n${report}`,
      report.replace("-->", "--> x"),
      report.replace("log=yes", "log=maybe"),
    ]) {
      equal(findReport([comment("a", body)], "a"), undefined);
    }
  });
});

describe("auditedNoChanges()", () => {
  it("returns whether the provider's output has no changed files", () => {
    const withOutput = (output: unknown) => [
      { ...passed, response: { output } },
    ];

    equal(auditedNoChanges(withOutput({ files: [] })), true);
    equal(auditedNoChanges(withOutput(JSON.stringify({ files: [] }))), true);
    equal(auditedNoChanges(withOutput({ files: [{ path: "a" }] })), false);
    // Without output, e.g. if the provider failed, nothing is known
    equal(auditedNoChanges([passed]), false);
  });
});

describe("formatComment()", () => {
  it("starts with the marker", () => {
    const body = formatComment([passed], HEAD, HEAD, true, 1);

    equal(body.match(MARKER)?.slice(1).join(), `${HEAD},yes`);
    match(body, /<sub>Audited abc123\. This check only reports\.<\/sub>$/);
  });

  it("explains how to audit skipped rules", () => {
    const body = formatComment([passed, skipped], HEAD, HEAD, false, 42);

    equal(body.match(MARKER)?.[2], "no");
    match(body, /`yarn eval:report 42`/);
  });

  it("warns if it did not audit the head of the pull request", () => {
    const old = formatComment([passed], HEAD, "def456", false, 1);

    match(old, /This audited def456, not the head of the pull request/);

    const dirty = formatComment([passed], HEAD, undefined, false, 1);

    match(dirty, /This audited uncommitted changes, not the head/);
    match(dirty, /<sub>Audited uncommitted changes\./);
  });

  it("warns if the audit found no changes", () => {
    const output = (files: string[]) => ({
      ...passed,
      response: { output: { files } },
    });
    const empty = formatComment([output([])], HEAD, HEAD, false, 1);

    match(empty, /This audited no changes/);

    const changed = formatComment([output(["a.ts"])], HEAD, HEAD, true, 1);

    equal(changed.includes("This audited no changes"), false);
  });

  it("says so if the audit did not produce a report", () => {
    const body = formatComment(undefined, HEAD, undefined, false, 1);

    match(body, /The audit did not produce a report\./);
    match(body, /`yarn eval:report 1`/);
    match(body, /<sub>Audited abc123\./);
  });
});

describe("markFailed()", () => {
  it("adds a note below the heading, keeping the marker", () => {
    const body = formatComment([passed], "old", "old", true, 1);
    const failed = markFailed(body, HEAD);

    equal(failed.match(MARKER)?.[1], "old");
    match(
      failed,
      /^### Agent evals\n\n> \[!CAUTION\]\n> The audit of abc123 failed; the report below is from an earlier run\.\n\n/m
    );
  });

  it("replaces an earlier note", () => {
    const body = formatComment([passed], "old", "old", true, 1);
    const failed = markFailed(markFailed(body, "def456"), HEAD);

    equal(failed.match(/\[!CAUTION\]/g)?.length, 1);
    match(failed, /The audit of abc123 failed/);
    equal(markFailed(failed, HEAD), failed);
  });
});
