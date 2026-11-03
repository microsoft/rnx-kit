/**
 * Formats the comment that `post-report.ts` and the agent evals workflow share
 * on a pull request.
 */
import { formatMarkdown, statusOf } from "@rnx-kit/agent-evals/report";
import type { EvalResult } from "@rnx-kit/agent-evals/report";

export const MARKER =
  /^<!-- agent-evals head=(\w+) log=(yes|no) -->(?:\r?\n|$)/;

/**
 * Besides the author of the pull request and the workflow, only these may post
 * reports; anyone else could suppress the audit with a fake one.
 */
const TRUSTED_ASSOCIATIONS = ["OWNER", "MEMBER", "COLLABORATOR"];

export type Comment = {
  id: number;
  body: string;
  login: string;
  association: string;
};

/**
 * Returns whether `comment` is a report posted by `author`, the author of the
 * pull request, by the workflow, or by a collaborator.
 */
export function isReport(comment: Comment, author: string): boolean {
  return (
    MARKER.test(comment.body) &&
    (comment.login === author ||
      comment.login === "github-actions[bot]" ||
      TRUSTED_ASSOCIATIONS.includes(comment.association))
  );
}

export function formatComment(
  results: EvalResult[] | undefined,
  head: string,
  audited: string | undefined,
  hasLog: boolean,
  number: number | string
): string {
  const lines = [
    `<!-- agent-evals head=${head} log=${hasLog ? "yes" : "no"} -->`,
    "### Agent evals",
    "",
    results ? formatMarkdown(results) : "The audit did not produce a report.",
  ];
  const statuses = results?.map(statusOf) ?? [];
  if (
    !results ||
    statuses.includes("skipped") ||
    statuses.includes("unchecked")
  ) {
    lines.push(
      "",
      "Skipped rules need the session log, and unchecked rules could not be evaluated, e.g. because the grader needs Copilot access. To audit them, run the following in `evals/`:",
      "",
      `- Copilot cloud agent: \`yarn eval:report ${number}\``,
      "- Copilot CLI: `yarn eval:report` on the branch, on the machine that ran the session"
    );
  }
  const subject = audited ?? "uncommitted changes";
  if (results && audited !== head) {
    lines.push(
      "",
      "> [!WARNING]",
      `> This audited ${subject}, not the head of the pull request (${head}). Push the changes, or audit the session that made them, and run \`yarn eval:report\` again.`
    );
  }
  lines.push(
    "",
    `<sub>Audited ${results ? subject : head}. This check only reports.</sub>`
  );
  return lines.join("\n");
}

const FAILED_NOTE = /\n> \[!CAUTION\]\n> The audit of \w+ failed[^\n]*\n/;

/**
 * Adds a note to a report that the audit of `head` failed, replacing an
 * earlier one. The marker is kept, so the workflow audits `head` again.
 */
export function markFailed(body: string, head: string): string {
  const note = `\n> [!CAUTION]\n> The audit of ${head} failed; the report below is from an earlier run.\n`;
  return body
    .replace(FAILED_NOTE, "")
    .replace(/^### Agent evals\n/m, (heading) => heading + note);
}
