import { makeCommand } from "@rnx-kit/tools-shell";
import * as path from "node:path";
import type { AgentCommand, GitHubItem } from "../types.ts";
import type { SessionToolCall } from "./session.ts";

const MCP_SERVER = "github-mcp-server";

/** GitHub MCP tools that only read */
const MCP_READ_TOOL = /^(download|get|list|search)_|_read$/;

/** Arguments of GitHub MCP tools that hold an issue or pull request number */
const MCP_NUMBER_ARGS = ["issue_number", "pullNumber"];

/** `gh issue` and `gh pr` subcommands that only read; all others write */
const GH_READS: Record<string, string[]> = {
  issue: ["list", "ls", "status", "view"],
  pr: ["checkout", "checks", "co", "diff", "list", "ls", "status", "view"],
};

/**
 * Returns the number in `123`, `#123` or an issue or pull request URL.
 */
function toNumber(arg: string): number | undefined {
  const match =
    arg.match(/^#?(\d+)$/) ??
    arg.match(
      /^https?:\/\/[^/\s]+\/[^/\s]+\/[^/\s]+\/(?:issues|pull)\/(\d+)(?:[/?#]\S*)?$/
    );
  return match ? Number(match[1]) : undefined;
}

function isRepository(repository: string, repo: unknown): boolean {
  const expected = repository.toLowerCase();
  return (
    typeof repo !== "string" ||
    repo.toLowerCase() === expected ||
    repo.toLowerCase() === `github.com/${expected}`
  );
}

function mcpWrite(
  repository: string,
  { name, arguments: args, server, serverTool }: SessionToolCall
): number | undefined {
  let tool: string | undefined;
  if (server === MCP_SERVER) {
    tool = serverTool ?? name;
  } else if (name.startsWith(`${MCP_SERVER}-`)) {
    tool = name.substring(MCP_SERVER.length + 1);
  }
  if (!tool || MCP_READ_TOOL.test(tool)) {
    return undefined;
  }

  const { owner, repo } = args;
  if (typeof owner === "string" && typeof repo === "string") {
    if (!isRepository(repository, `${owner}/${repo}`)) {
      return undefined;
    }
  }

  for (const key of MCP_NUMBER_ARGS) {
    const number = Number(args[key]);
    if (Number.isInteger(number) && number > 0) {
      return number;
    }
  }
  return undefined;
}

/**
 * Returns the number written to by `gh api`, e.g. `gh api -X POST
 * repos/{owner}/{repo}/issues/1/comments`. Only the method, whether fields
 * are passed, and the endpoint are needed.
 */
function ghApiWrite(repository: string, args: string[]): number | undefined {
  let method: string | undefined;
  let hasFields = false;
  let match: RegExpMatchArray | null = null;
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i];
    if (arg === "-X" || arg === "--method") {
      method = args[++i]?.toUpperCase();
    } else if (arg.startsWith("--method=")) {
      method = arg.substring("--method=".length).toUpperCase();
    } else if (/^-X./.test(arg)) {
      method = arg.substring(2).toUpperCase();
    } else if (/^(-[fF]|--(raw-)?field(=|$)|--input(=|$))/.test(arg)) {
      hasFields = true;
    } else if (!match) {
      match = arg
        .replace("{owner}/{repo}", repository)
        .match(/^\/?repos\/([^/]+\/[^/]+)\/(issues|pulls)\/(\d+)/);
    }
  }

  if ((method ?? (hasFields ? "POST" : "GET")) === "GET") {
    return undefined;
  }

  return match && isRepository(repository, match[1])
    ? Number(match[3])
    : undefined;
}

function ghWrite(
  repository: string,
  { argv }: AgentCommand
): number | undefined {
  const [executable = "", command, subcommand, ...rest] = argv;
  if (path.win32.basename(executable).replace(/\.exe$/i, "") !== "gh") {
    return undefined;
  }

  if (command === "api") {
    return ghApiWrite(repository, argv.slice(2));
  }

  if (
    (command !== "issue" && command !== "pr") ||
    GH_READS[command].includes(subcommand)
  ) {
    return undefined;
  }

  // Only the repository and the number are needed. Flag values that precede
  // the number are skipped unless they look like a number themselves.
  let repo: string | undefined;
  let number: number | undefined;
  for (let i = 0; i < rest.length; ++i) {
    const arg = rest[i];
    if (arg === "-R" || arg === "--repo") {
      repo = rest[++i];
    } else if (arg.startsWith("--repo=")) {
      repo = arg.substring("--repo=".length);
    } else if (/^-R./.test(arg)) {
      repo = arg.substring(2);
    } else if (arg === "--duplicate-of") {
      ++i;
    } else if (number === undefined && !arg.startsWith("-")) {
      number = toNumber(arg);
    }
  }
  return isRepository(repository, repo) ? number : undefined;
}

/**
 * Returns the numbers of issues and pull requests in `repository`
 * (`owner/repo`) that the agent wrote to through the GitHub MCP tools or the
 * `gh` CLI. Writes that create items, or that do not name the item (e.g.
 * `gh pr comment` on the current branch), are not included.
 */
export function modifiedNumbers(
  repository: string,
  toolCalls: SessionToolCall[],
  commands: AgentCommand[]
): number[] {
  const numbers = new Set<number>();
  for (const number of [
    ...toolCalls.map((call) => mcpWrite(repository, call)),
    ...commands.map((command) => ghWrite(repository, command)),
  ]) {
    if (number !== undefined) {
      numbers.add(number);
    }
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

const gh = makeCommand("gh", {
  env: { ...process.env, GH_PROMPT_DISABLED: "1" },
  timeout: 30 * 1000,
});

async function ghJson<T>(args: string[]): Promise<T | undefined> {
  try {
    const { stdout, status } = await gh(...args);
    return status === 0 ? (JSON.parse(stdout) as T) : undefined;
  } catch (_) {
    return undefined;
  }
}

/**
 * Looks up the author of the pull request for `branch` in `repository`,
 * i.e. the user the session acted as, and the specified issues and pull
 * requests. Only reads from GitHub. Values that cannot be looked up, e.g. the
 * author if the session did not open a pull request, are omitted.
 */
export async function lookUp(
  repository: string,
  numbers: number[],
  branch: string
): Promise<{ actor?: string; items: GitHubItem[] }> {
  const [owner] = repository.split("/");
  const head = encodeURIComponent(`${owner}:${branch}`);
  const pulls = await ghJson<{ user: { login: string } }[]>([
    "api",
    `repos/${repository}/pulls?head=${head}&state=all&per_page=1`,
  ]);
  const user = pulls?.[0]?.user;
  const items = await Promise.all(
    numbers.map(async (number) => {
      const issue = await ghJson<{ title: string; user: { login: string } }>([
        "api",
        `repos/${repository}/issues/${number}`,
      ]);
      return issue
        ? { number, title: issue.title, author: issue.user.login }
        : undefined;
    })
  );
  return {
    ...(user ? { actor: user.login } : {}),
    items: items.filter((item) => item !== undefined),
  };
}
