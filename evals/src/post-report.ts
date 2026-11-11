/**
 * Runs the evals and posts the report on a pull request, in a comment shared
 * with the agent evals workflow.
 *
 * Usage: yarn eval:report [<number>] [<promptfoo args>]
 *
 * - Without a number, audits a local Copilot session (see `vars.copilotSession`
 *   in `promptfooconfig.yaml`) and posts on the pull request of the current
 *   branch.
 * - With a number, audits that pull request; see `vars.pullRequest` in
 *   `promptfooconfig.yaml`.
 */
import { statusOf } from "@rnx-kit/agent-evals/report";
import type { EvalResult } from "@rnx-kit/agent-evals/report";
import { readJSONFileSync, writeTextFileSync } from "@rnx-kit/tools-filesystem";
import { ensure, makeCommandSync } from "@rnx-kit/tools-shell";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  findReport,
  formatComment,
  markFailed,
  MARKER,
} from "./report-comment.ts";
import type { Comment } from "./report-comment.ts";

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

function findComment(
  number: number | string,
  author: string
): Comment | undefined {
  // `--paginate` with `--jq` prints one JSON object per line
  const output = ghApi(
    `issues/${number}/comments`,
    "--paginate",
    "--jq",
    ".[] | {id, body, login: .user.login}"
  );
  const comments: Comment[] = [];
  for (const line of output.split("\n")) {
    if (line) {
      comments.push(JSON.parse(line));
    }
  }

  return findReport(comments, author);
}

function main(args: string[]): void {
  const number = /^\d+$/.test(args[0] ?? "") ? args.shift() : undefined;
  if (number && !/^[1-9]\d*$/.test(number)) {
    throw new Error(`Invalid pull request number: ${number}`);
  }

  const pr = JSON.parse(
    gh("pr", "view", ...(number ? [number] : []), "--json", "number,headRefOid")
  ) as { number: number; headRefOid: string };
  // Unlike `gh pr view`, matches the logins of comments, e.g. `Copilot`
  const author = ghApi(`pulls/${pr.number}`, "--jq", ".user.login").trim();

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-evals-"));
  try {
    const output = path.join(dir, "results.json");
    // `.cmd` files can only be spawned through a shell on Windows
    const [yarn, ...yarnArgs] =
      process.platform === "win32" ? ["cmd.exe", "/c", "yarn.cmd"] : ["yarn"];
    // Failed rules make promptfoo exit with an error; they are in the results
    const { error } = spawnSync(
      yarn,
      [
        ...yarnArgs,
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
    if (error) {
      throw error;
    }

    const results = fs.existsSync(output)
      ? readJSONFileSync<EvalOutput>(output).results.results
      : undefined;
    // Read again; the agent may have posted a report during the audit
    const existing = findComment(pr.number, author);
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

    const [, reportedHead, reportedLog] = existing?.body.match(MARKER) ?? [];
    if (!hasLog && reportedHead === pr.headRefOid && reportedLog === "yes") {
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
    let url: string | undefined;
    if (existing) {
      try {
        url = ghApi(
          `issues/comments/${existing.id}`,
          "--method",
          "PATCH",
          ...post
        );
      } catch (e) {
        // Only users with write access may edit comments by others, e.g. the
        // workflow's report on a pull request from a fork
        if (!Error.isError(e) || !e.message.includes("(HTTP 403)")) {
          throw e;
        }

        console.log(
          `Cannot edit the report by ${existing.login}; posting a new one`
        );
      }
    }
    url ??= ghApi(`issues/${pr.number}/comments`, ...post);
    console.log(`Posted the report: ${url.trim()}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main(process.argv.slice(2));
