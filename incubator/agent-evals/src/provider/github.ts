import { makeCommand } from "@rnx-kit/tools-shell";
import * as path from "node:path";
import type { AgentCommand, GitHubItem } from "../types.ts";
import type { SessionToolCall } from "./session.ts";

const MCP_SERVER = "github-mcp-server";

/** GitHub MCP tools that only read */
const MCP_READ_TOOL = /^(download|get|list|search)_|_read$/;

/** Arguments of GitHub MCP tools that hold an issue or pull request number */
const MCP_NUMBER_ARGS = [
  "issue_number",
  "issueNumber",
  "pullNumber",
  "pull_number",
];

/** Flags of `gh issue|pr` that take a value */
const GH_VALUE_FLAGS = new Set([
  "-A",
  "-B",
  "-F",
  "-H",
  "-L",
  "-R",
  "-S",
  "-T",
  "-a",
  "-b",
  "-c",
  "-l",
  "-m",
  "-n",
  "-p",
  "-q",
  "-r",
  "-s",
  "-t",
  "--add-assignee",
  "--add-label",
  "--add-project",
  "--add-reviewer",
  "--assignee",
  "--author",
  "--author-email",
  "--base",
  "--body",
  "--body-file",
  "--comment",
  "--duplicate-of",
  "--head",
  "--jq",
  "--json",
  "--label",
  "--limit",
  "--match-head-commit",
  "--milestone",
  "--name",
  "--project",
  "--reason",
  "--remove-assignee",
  "--remove-label",
  "--remove-project",
  "--remove-reviewer",
  "--repo",
  "--reviewer",
  "--search",
  "--state",
  "--subject",
  "--template",
  "--title",
]);

/** Short flags that do not take a value in specific `gh` commands */
const GH_BOOLEAN_FLAGS: Record<string, string[]> = {
  "issue develop": ["-c"],
  "pr merge": ["-d", "-m", "-r", "-s"],
  "pr review": ["-a", "-c", "-r"],
};

const GH_WRITES: Record<string, string[]> = {
  issue: [
    "close",
    "comment",
    "create",
    "delete",
    "develop",
    "edit",
    "lock",
    "pin",
    "reopen",
    "transfer",
    "unlock",
    "unpin",
  ],
  pr: [
    "close",
    "comment",
    "create",
    "edit",
    "lock",
    "merge",
    "ready",
    "reopen",
    "review",
    "unlock",
    "update-branch",
  ],
};

function parseGhArgs(
  command: string,
  args: string[]
): { flags: Map<string, string | true>; positionals: string[] } {
  const booleans = GH_BOOLEAN_FLAGS[command] ?? [];
  const flags = new Map<string, string | true>();
  const positionals: string[] = [];
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i];
    const eq = arg.indexOf("=");
    if (arg.startsWith("--") && eq > 0) {
      flags.set(arg.substring(0, eq), arg.substring(eq + 1));
    } else if (GH_VALUE_FLAGS.has(arg) && !booleans.includes(arg)) {
      flags.set(arg, args[++i] ?? "");
    } else if (arg.startsWith("-")) {
      flags.set(arg, true);
    } else {
      positionals.push(arg);
    }
  }
  return { flags, positionals };
}

function toNumber(arg: string | undefined): number | undefined {
  const match =
    arg?.match(/^#?(\d+)$/) ?? arg?.match(/\/(?:issues|pull)\/(\d+)/);
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
 * repos/{owner}/{repo}/issues/1/comments`.
 */
function ghApiWrite(repository: string, args: string[]): number | undefined {
  let method: string | undefined;
  let hasFields = false;
  const positionals: string[] = [];
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i];
    if (arg === "-X" || arg === "--method") {
      method = args[++i]?.toUpperCase();
    } else if (arg.startsWith("--method=")) {
      method = arg.substring("--method=".length).toUpperCase();
    } else if (/^-X./.test(arg)) {
      method = arg.substring(2).toUpperCase();
    } else if (/^-[fF]$|^--(raw-)?field$|^--input$/.test(arg)) {
      hasFields = true;
      ++i;
    } else if (/^-[fF].|^--(raw-)?field=|^--input=/.test(arg)) {
      hasFields = true;
    } else if (/^(-H|--header|-q|--jq|-t|--template|--hostname)$/.test(arg)) {
      ++i;
    } else if (!arg.startsWith("-")) {
      positionals.push(arg);
    }
  }

  if ((method ?? (hasFields ? "POST" : "GET")) === "GET") {
    return undefined;
  }

  const endpoint = (positionals[0] ?? "")
    .replace(/^\//, "")
    .replace("{owner}/{repo}", repository);
  const match = endpoint.match(/^repos\/([^/]+\/[^/]+)\/(issues|pulls)\/(\d+)/);
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
    !GH_WRITES[command].includes(subcommand)
  ) {
    return undefined;
  }

  const { flags, positionals } = parseGhArgs(`${command} ${subcommand}`, rest);
  const repo = flags.get("-R") ?? flags.get("--repo");
  return isRepository(repository, repo) ? toNumber(positionals[0]) : undefined;
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
