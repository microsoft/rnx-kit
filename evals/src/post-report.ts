/**
 * Runs the evals and posts the report on a pull request, in a comment shared
 * with the agent evals workflow.
 *
 * Usage: yarn eval:report [--unless-reported] [<number>] [<promptfoo args>]
 *
 * - Without a number, audits a local Copilot session (see `vars.copilotSession`
 *   in `promptfooconfig.yaml`) and posts on the pull request of the current
 *   branch.
 * - With a number, audits that pull request; see `vars.pullRequest` in
 *   `promptfooconfig.yaml`.
 * - With `--unless-reported`, does nothing if the comment already has a report
 *   with the session log for the head of the pull request.
 */
import { formatMarkdown, statusOf } from "@rnx-kit/agent-evals/report";
import type { EvalResult } from "@rnx-kit/agent-evals/report";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = /<!-- agent-evals head=(\w+) log=(yes|no) -->/;

type Comment = { id: number; body: string };

/** Subset of the file that `promptfoo eval --output <file>.json` writes */
type EvalOutput = { results: { results: EvalResult[] } };

function gh(...args: string[]): string {
  const { error, status, stderr, stdout } = spawnSync("gh", args, {
    encoding: "utf-8",
  });
  if (error || status !== 0) {
    throw new Error(`gh ${args.join(" ")}: ${error?.message ?? stderr}`);
  }
  return stdout;
}

function findComment(repository: string, number: string): Comment | undefined {
  // `--paginate` with `--jq` prints one JSON object per line
  const comments = gh(
    "api",
    "--paginate",
    `repos/${repository}/issues/${number}/comments`,
    "--jq",
    ".[] | {id, body}"
  );
  for (const line of comments.split("\n")) {
    const comment = line ? (JSON.parse(line) as Comment) : undefined;
    if (comment && MARKER.test(comment.body)) {
      return comment;
    }
  }
  return undefined;
}

function formatComment(
  results: EvalResult[] | undefined,
  head: string,
  hasLog: boolean,
  number: string
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
  lines.push("", `<sub>Audited ${head}. This check only reports.</sub>`);
  return lines.join("\n");
}

function main(argv: string[]): void {
  const args = argv.filter((arg) => arg !== "--unless-reported");
  const unlessReported = args.length < argv.length;
  const number = /^\d+$/.test(args[0] ?? "") ? args.shift() : undefined;

  const repository = gh(
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "--jq",
    ".nameWithOwner"
  ).trim();
  const pr = JSON.parse(
    gh("pr", "view", ...(number ? [number] : []), "--json", "number,headRefOid")
  ) as { number: number; headRefOid: string };
  const prNumber = String(pr.number);

  const existing = findComment(repository, prNumber);
  const [, reportedHead, reportedLog] = existing?.body.match(MARKER) ?? [];
  if (
    unlessReported &&
    reportedHead === pr.headRefOid &&
    reportedLog === "yes"
  ) {
    console.log(`#${prNumber} already has a report for ${pr.headRefOid}`);
    return;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-evals-"));
  try {
    const output = path.join(dir, "results.json");
    // Failed rules make promptfoo exit with an error; they are in the results
    spawnSync(
      "yarn",
      [
        "eval",
        ...(number ? ["--var", `pullRequest=${number}`] : []),
        ...args,
        "--output",
        output,
      ],
      {
        cwd: fileURLToPath(new URL("..", import.meta.url)),
        stdio: "inherit",
      }
    );

    const results = fs.existsSync(output)
      ? (JSON.parse(fs.readFileSync(output, "utf-8")) as EvalOutput).results
          .results
      : undefined;
    // Without the session, every rule is skipped or unchecked
    const statuses = results?.map(statusOf) ?? [];
    const hasLog =
      !statuses.includes("skipped") &&
      (statuses.includes("passed") || statuses.includes("failed"));
    const body = formatComment(results, pr.headRefOid, hasLog, prNumber);

    const summary = process.env["GITHUB_STEP_SUMMARY"];
    if (summary) {
      fs.appendFileSync(summary, `${body}\n`);
    }

    const bodyFile = path.join(dir, "comment.md");
    fs.writeFileSync(bodyFile, body);
    const url = existing
      ? gh(
          "api",
          "--method",
          "PATCH",
          `repos/${repository}/issues/comments/${existing.id}`,
          "-F",
          `body=@${bodyFile}`,
          "--jq",
          ".html_url"
        )
      : gh(
          "api",
          `repos/${repository}/issues/${prNumber}/comments`,
          "-F",
          `body=@${bodyFile}`,
          "--jq",
          ".html_url"
        );
    console.log(`Posted the report: ${url.trim()}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main(process.argv.slice(2));
