import type { EvalResult } from "@rnx-kit/agent-evals/report";
import { equal, match } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatComment,
  isReport,
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

function comment(login: string, association: string, body: string): Comment {
  return { id: 1, login, association, body };
}

describe("isReport()", () => {
  const report = `<!-- agent-evals head=${HEAD} log=yes -->\n### Agent evals`;

  it("accepts reports by the author, the workflow and collaborators", () => {
    equal(isReport(comment("Copilot", "NONE", report), "Copilot"), true);
    equal(isReport(comment("github-actions[bot]", "NONE", report), "a"), true);
    for (const association of ["OWNER", "MEMBER", "COLLABORATOR"]) {
      equal(isReport(comment("x", association, report), "a"), true);
    }
  });

  it("rejects reports by anyone else", () => {
    for (const association of ["CONTRIBUTOR", "FIRST_TIMER", "NONE"]) {
      equal(isReport(comment("x", association, report), "a"), false);
    }
  });

  it("accepts the marker only on a line of its own at the start", () => {
    const crlf = report.replaceAll("\n", "\r\n");
    equal(isReport(comment("a", "NONE", crlf), "a"), true);
    for (const body of [
      `See \`${report}\``,
      `Hi\n${report}`,
      report.replace("-->", "--> x"),
      report.replace("log=yes", "log=maybe"),
    ]) {
      equal(isReport(comment("a", "NONE", body), "a"), false);
    }
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
