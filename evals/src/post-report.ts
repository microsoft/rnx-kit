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
import { readJSONFileSync, writeTextFileSync } from "@rnx-kit/tools-filesystem";
import { ensure, makeCommandSync } from "@rnx-kit/tools-shell";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = /<!-- agent-evals head=(\w+) log=(yes|no) -->/;

type Comment = { id: number; body: string };

type Result = EvalResult & {
  response?: { metadata?: { endCommit?: string } };
};

/** Subset of the file that `promptfoo eval --output <file>.json` writes */
type EvalOutput = { results: { results: Result[] } };

/** Returns a command that throws if it fails, and otherwise returns stdout */
function makeCheckedCommand(name: string): (...args: string[]) => string {
  const command = makeCommandSync(name);
  return (...args) => {
    const result = command(...args);
    return ensure(result, `${name} ${args.join(" ")}: ${result.stderr}`);
  };
}

const gh = makeCheckedCommand("gh");
const git = makeCheckedCommand("git");

/**
 * Calls the REST API of the current repository, which `gh` fills in.
 */
function ghApi(endpoint: string, ...args: string[]): string {
  return gh("api", `repos/{owner}/{repo}/${endpoint}`, ...args);
}

/**
 * Returns the commit whose changes were audited, or `undefined` if it is
 * unknown or there were uncommitted changes.
 */
function auditedCommit(results: Result[]): string | undefined {
  const endCommit = results.find(
    (result) => result.response?.metadata?.endCommit
  )?.response?.metadata?.endCommit;
  if (endCommit !== "WORKING_TREE") {
    return endCommit;
  }

  // The session's branch is checked out, and its working tree was audited
  if (git("status", "--porcelain", "--untracked-files=no")) {
    return undefined;
  }
  return git("rev-parse", "HEAD").trim();
}

function findComment(number: number | string): Comment | undefined {
  // `--paginate` with `--jq` prints one JSON object per line
  const comments = ghApi(
    `issues/${number}/comments`,
    "--paginate",
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
function markFailed(body: string, head: string): string {
  const note = `\n> [!CAUTION]\n> The audit of ${head} failed; the report below is from an earlier run.\n`;
  return body
    .replace(FAILED_NOTE, "")
    .replace(/^### Agent evals\n/m, (heading) => heading + note);
}

function main(argv: string[]): void {
  const args = argv.filter((arg) => arg !== "--unless-reported");
  const unlessReported = args.length < argv.length;
  const number = /^\d+$/.test(args[0] ?? "") ? args.shift() : undefined;
  if (number && !/^[1-9]\d*$/.test(number)) {
    throw new Error(`Invalid pull request number: ${number}`);
  }

  const pr = JSON.parse(
    gh("pr", "view", ...(number ? [number] : []), "--json", "number,headRefOid")
  ) as { number: number; headRefOid: string };

  const hasFullReport = (comment: Comment | undefined) => {
    const [, head, log] = comment?.body.match(MARKER) ?? [];
    return head === pr.headRefOid && log === "yes";
  };
  if (unlessReported && hasFullReport(findComment(pr.number))) {
    console.log(`#${pr.number} already has a report for ${pr.headRefOid}`);
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
      ? readJSONFileSync<EvalOutput>(output).results.results
      : undefined;
    // Read again; the agent may have posted a report during the audit
    const existing = findComment(pr.number);
    let hasLog = false;
    let body: string;
    if (results) {
      const audited = auditedCommit(results);
      // Without the session, every rule is skipped or unchecked
      const statuses = results.map(statusOf);
      hasLog =
        audited === pr.headRefOid &&
        !statuses.includes("skipped") &&
        (statuses.includes("passed") || statuses.includes("failed"));
      body = formatComment(results, pr.headRefOid, audited, hasLog, pr.number);
    } else {
      // Keep the last report instead of replacing it with nothing
      console.error("The audit did not produce a report");
      process.exitCode = 1;
      body = existing
        ? markFailed(existing.body, pr.headRefOid)
        : formatComment(undefined, pr.headRefOid, undefined, false, pr.number);
    }

    if (!hasLog && hasFullReport(existing)) {
      console.log(
        `#${pr.number} already has a report with the session log for ${pr.headRefOid}; keeping it`
      );
      return;
    }

    const summary = process.env["GITHUB_STEP_SUMMARY"];
    if (summary) {
      fs.appendFileSync(summary, `${body}\n`);
    }

    const bodyFile = path.join(dir, "comment.md");
    writeTextFileSync(bodyFile, body);
    const post = ["-F", `body=@${bodyFile}`, "--jq", ".html_url"];
    const url = existing
      ? ghApi(`issues/comments/${existing.id}`, "--method", "PATCH", ...post)
      : ghApi(`issues/${pr.number}/comments`, ...post);
    console.log(`Posted the report: ${url.trim()}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main(process.argv.slice(2));
