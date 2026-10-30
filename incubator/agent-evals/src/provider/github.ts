import { makeCommand } from "@rnx-kit/tools-shell";
import { withoutExecutablePath } from "../common.ts";
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

const UNKNOWN = "unknown";

/**
 * A write to GitHub: the number of the issue or pull request written to,
 * `UNKNOWN` if it could not be determined, or `undefined` if not a write to an
 * existing item in the repository.
 */
type Write = number | typeof UNKNOWN | undefined;

/** GitHub MCP tools that write to a comment identified only by its ID */
const MCP_COMMENT_TOOLS = [
  "add_reply_to_pull_request_comment",
  "update_issue_comment",
];

function mcpWrite(
  repository: string,
  { name, arguments: args, server, serverTool }: SessionToolCall
): Write {
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
  return MCP_COMMENT_TOOLS.includes(tool) ? UNKNOWN : undefined;
}

/** A GraphQL document that only reads: a `query` or a `{ … }` shorthand */
const GRAPHQL_QUERY = /^[\s,]*(?:query\b|\{)/;

/**
 * Returns whether the fields of a `gh api graphql` call send only queries.
 * Queries must be inline; queries read from a file (`-F query=@file`) or
 * passed with `--input` are assumed to be mutations.
 */
function isGraphQLQuery(fields: { flag: string; value: string }[]): boolean {
  let hasQuery = false;
  for (const { flag, value } of fields) {
    if (flag === "--input") {
      return false;
    }
    if (value.startsWith("query=")) {
      // Comments run to the end of the line
      const query = value.substring("query=".length).replace(/#[^\n\r]*/g, "");
      const fromFile =
        (flag === "-F" || flag === "--field") && query.startsWith("@");
      if (fromFile || !GRAPHQL_QUERY.test(query)) {
        return false;
      }
      hasQuery = true;
    }
  }
  return hasQuery;
}

/**
 * Returns the item written to by `gh api`, e.g. `gh api -X POST
 * repos/{owner}/{repo}/issues/1/comments`. Only the method, the fields and
 * the endpoint are needed. GraphQL calls other than inline queries, and
 * writes to comments by ID, are `UNKNOWN`.
 */
function ghApiWrite(repository: string, args: string[]): Write {
  let method: string | undefined;
  const fields: { flag: string; value: string }[] = [];
  let isGraphQL = false;
  let match: RegExpMatchArray | null = null;
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i];
    const field = arg.match(/^(-[fF])(.+)$|^(--(?:raw-)?field|--input)=(.*)$/);
    if (arg === "-X" || arg === "--method") {
      method = args[++i]?.toUpperCase();
    } else if (arg.startsWith("--method=")) {
      method = arg.substring("--method=".length).toUpperCase();
    } else if (/^-X./.test(arg)) {
      method = arg.substring(2).toUpperCase();
    } else if (/^(-[fF]|--(raw-)?field|--input)$/.test(arg)) {
      fields.push({ flag: arg, value: args[++i] ?? "" });
    } else if (field) {
      fields.push({
        flag: field[1] ?? field[3],
        value: field[2] ?? field[4],
      });
    } else {
      // Endpoints may be full URLs, e.g. `https://api.github.com/graphql`
      const endpoint = arg
        .replace(/^https?:\/\/(api\.github\.com|[^/]+\/api\/v3)\//, "")
        .replace("{owner}/{repo}", repository);
      if (/^\/?graphql$/.test(endpoint)) {
        isGraphQL = true;
      } else if (!match) {
        match = endpoint.match(
          /^\/?repos\/([^/]+\/[^/]+)\/(issues|pulls)\/(\d+|comments\/\d+)/
        );
      }
    }
  }

  if (isGraphQL) {
    return isGraphQLQuery(fields) ? undefined : UNKNOWN;
  }

  if ((method ?? (fields.length > 0 ? "POST" : "GET")) === "GET") {
    return undefined;
  }

  if (!match || !isRepository(repository, match[1])) {
    return undefined;
  }

  return match[3].startsWith("comments/") ? UNKNOWN : Number(match[3]);
}

/**
 * Returns the repository (`-R`, `--repo`) and the issue or pull request
 * number in the arguments of `gh issue` and `gh pr` subcommands. Flag values
 * that precede the number are skipped unless they look like a number
 * themselves.
 */
function ghItemArgs(args: string[]): { repo?: string; number?: number } {
  let repo: string | undefined;
  let number: number | undefined;
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i];
    if (arg === "-R" || arg === "--repo") {
      repo = args[++i];
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
  return { repo, number };
}

/**
 * Returns the issues and pull requests in `repository` (`owner/repo`) that
 * the agent wrote to through the GitHub MCP tools or the `gh` CLI:
 *
 * - `modified`: the numbers of the items written to. Writes to a pull request
 *   without a number, e.g. `gh pr comment`, are attributed to the pull request
 *   checked out last with `gh pr checkout`. `gh pr create`, `git checkout
 *   <ref>` and `git switch` end that attribution. Writes that create items,
 *   or that do not name the item and follow no checkout, are not included.
 * - `unknownWrites`: writes whose item could not be determined, e.g. GraphQL
 *   calls other than inline queries, writes to comments by ID, and writes
 *   without a number after `gh pr checkout <branch>`.
 */
export function gitHubWrites(
  repository: string,
  toolCalls: SessionToolCall[],
  commands: AgentCommand[]
): { modified: number[]; unknownWrites: string[] } {
  const numbers = new Set<number>();
  const unknownWrites: string[] = [];
  const add = (write: Write, description: string) => {
    if (write === UNKNOWN) {
      unknownWrites.push(description);
    } else if (write !== undefined) {
      numbers.add(write);
    }
  };

  for (const call of toolCalls) {
    add(
      mcpWrite(repository, call),
      `${call.name} ${JSON.stringify(call.arguments)}`
    );
  }

  let checkedOut: Write;
  for (const { argv } of commands) {
    const [executable = "", command, subcommand, ...rest] = argv;
    const program = withoutExecutablePath(executable);
    if (program === "git") {
      // Switching branches leaves the pull request; `git checkout [<ref>] --
      // <path>` only restores files
      const args = argv.slice(2);
      if (
        (command === "checkout" || command === "switch") &&
        args.length > 0 &&
        !args.includes("--")
      ) {
        checkedOut = undefined;
      }
      continue;
    }

    if (program !== "gh") {
      continue;
    }

    if (command === "api") {
      add(ghApiWrite(repository, argv.slice(2)), argv.join(" "));
      continue;
    }

    if (command !== "issue" && command !== "pr") {
      continue;
    }

    const { repo, number } = ghItemArgs(rest);
    if (!isRepository(repository, repo)) {
      continue;
    }

    if (
      command === "pr" &&
      (subcommand === "checkout" || subcommand === "co")
    ) {
      // A branch name names no pull request we can look up
      checkedOut = number ?? UNKNOWN;
    } else if (command === "pr" && subcommand === "create") {
      // The new pull request is the session's own
      checkedOut = undefined;
    } else if (!GH_READS[command].includes(subcommand)) {
      add(
        number ?? (command === "pr" ? checkedOut : undefined),
        argv.join(" ")
      );
    }
  }

  return {
    modified: Array.from(numbers).sort((a, b) => a - b),
    unknownWrites,
  };
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
 * Looks up the authenticated `gh` user, i.e. the user the session acted as,
 * and the specified issues and pull requests in `repository`. Only reads from
 * GitHub. Values that cannot be looked up are omitted.
 */
export async function lookUp(
  repository: string,
  numbers: number[]
): Promise<{ actor?: string; items: GitHubItem[] }> {
  const user = await ghJson<{ login: string }>(["api", "user"]);
  const items = await Promise.all(
    numbers.map(async (number) => {
      const issue = await ghJson<{
        title: string;
        user: { login: string } | null;
      }>(["api", `repos/${repository}/issues/${number}`]);
      return issue
        ? { number, title: issue.title, author: issue.user?.login ?? "ghost" }
        : undefined;
    })
  );
  return {
    ...(user?.login ? { actor: user.login } : {}),
    items: items.filter((item) => item !== undefined),
  };
}
