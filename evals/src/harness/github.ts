import * as fs from "node:fs";
import parseDiff from "parse-diff";
import type { GitHubFixture } from "../types.ts";

const REPOSITORY = "microsoft/rnx-kit";

type Item = {
  number: number;
  title: string;
  author: string;
  body: string;
  labels: string[];
  diff?: string;
};

type JsonSchema = Record<string, unknown>;

type ToolSpec = {
  name: string;
  description: string;
  parameters: JsonSchema;
  handler: (args: Record<string, unknown>) => unknown;
};

/**
 * Serves a `GitHubFixture` and records the numbers of issues and pull
 * requests that writes touch. Nothing is sent to GitHub.
 */
export class GitHubMock {
  private readonly fixture: GitHubFixture;
  private readonly log: string;

  constructor(fixture: GitHubFixture, log: string) {
    this.fixture = fixture;
    this.log = log;
  }

  /** Numbers of issues and pull requests modified so far */
  modified(): number[] {
    if (!fs.existsSync(this.log)) {
      return [];
    }
    const numbers = new Set<number>();
    for (const line of fs.readFileSync(this.log, "utf8").split("\n")) {
      if (line) {
        numbers.add(JSON.parse(line));
      }
    }
    return [...numbers];
  }

  get viewer(): string {
    return this.fixture.viewer;
  }

  issues(): Item[] {
    return (this.fixture.issues ?? []).map((issue) => ({
      ...issue,
      labels: issue.labels ?? [],
    }));
  }

  pullRequests(): Item[] {
    return (this.fixture.pullRequests ?? []).map((pr) => ({
      ...pr,
      labels: [],
    }));
  }

  find(number: number): { item: Item; isPullRequest: boolean } | undefined {
    const pr = this.pullRequests().find((item) => item.number === number);
    if (pr) {
      return { item: pr, isPullRequest: true };
    }
    const issue = this.issues().find((item) => item.number === number);
    return issue && { item: issue, isPullRequest: false };
  }

  /** Records a write to `number`, or to a new item if omitted */
  write(number?: number): number {
    const target = number ?? Math.max(0, ...this.allNumbers()) + 1;
    fs.appendFileSync(this.log, JSON.stringify(target) + "\n");
    return target;
  }

  private allNumbers(): number[] {
    return [
      ...this.issues().map((item) => item.number),
      ...this.pullRequests().map((item) => item.number),
      ...this.modified(),
    ];
  }
}

export function toIssue({ number, title, author, body, labels }: Item) {
  return {
    number,
    title,
    body,
    state: "open",
    user: { login: author },
    labels: labels.map((name) => ({ name })),
    html_url: `https://github.com/${REPOSITORY}/issues/${number}`,
  };
}

export function toPullRequest({ number, title, author, body }: Item) {
  return {
    number,
    title,
    body,
    state: "open",
    draft: false,
    user: { login: author },
    html_url: `https://github.com/${REPOSITORY}/pull/${number}`,
  };
}

export function changedFiles({ diff }: Item) {
  return parseDiff(diff ?? "").map((file) => ({
    filename: file.to === "/dev/null" ? file.from : file.to,
    additions: file.additions,
    deletions: file.deletions,
  }));
}

function checkRepository(args: Record<string, unknown>): void {
  const { owner, repo } = args;
  if (`${owner}/${repo}`.toLowerCase() !== REPOSITORY) {
    throw new Error(`Repository ${owner}/${repo} not found`);
  }
}

function getItem(mock: GitHubMock, args: Record<string, unknown>, key: string) {
  const number = Number(args[key]);
  const found = mock.find(number);
  if (!found) {
    throw new Error(
      `Could not resolve to an issue or pull request: #${number}`
    );
  }
  return found.item;
}

const repoParams = {
  owner: { type: "string", description: "Repository owner" },
  repo: { type: "string", description: "Repository name" },
};

function params(
  properties: Record<string, JsonSchema>,
  required: string[] = []
): JsonSchema {
  return {
    type: "object",
    properties: { ...repoParams, ...properties },
    required: ["owner", "repo", ...required],
  };
}

const str = { type: "string" };
const num = { type: "number" };

/**
 * Returns tools with the names and parameters of the GitHub MCP server's
 * tools, backed by the mock.
 */
export function githubTools(mock: GitHubMock): ToolSpec[] {
  const readTools: ToolSpec[] = [
    {
      name: "get_me",
      description: "Get details of the authenticated GitHub user",
      parameters: { type: "object", properties: {} },
      handler: () => ({ login: mock.viewer }),
    },
    {
      name: "list_issues",
      description: "List issues in a GitHub repository",
      parameters: params({ state: str, labels: { type: "array", items: str } }),
      handler: (args) => {
        checkRepository(args);
        const labels = (args.labels as string[] | undefined) ?? [];
        return mock
          .issues()
          .filter((issue) => labels.every((l) => issue.labels.includes(l)))
          .map(toIssue);
      },
    },
    {
      name: "search_issues",
      description: "Search issues in a GitHub repository",
      parameters: params({ query: str }, ["query"]),
      handler: (args) => {
        checkRepository(args);
        return mock.issues().map(toIssue);
      },
    },
    {
      name: "issue_read",
      description: "Get an issue, its comments or its labels",
      parameters: params(
        {
          issue_number: num,
          method: {
            type: "string",
            enum: ["get", "get_comments", "get_labels"],
          },
        },
        ["issue_number"]
      ),
      handler: (args) => {
        checkRepository(args);
        const issue = getItem(mock, args, "issue_number");
        switch (args.method) {
          case "get_comments":
            return [];
          case "get_labels":
            return toIssue(issue).labels;
          default:
            return toIssue(issue);
        }
      },
    },
    {
      name: "list_pull_requests",
      description: "List pull requests in a GitHub repository",
      parameters: params({ state: str }),
      handler: (args) => {
        checkRepository(args);
        return mock.pullRequests().map(toPullRequest);
      },
    },
    {
      name: "search_pull_requests",
      description: "Search pull requests in a GitHub repository",
      parameters: params({ query: str }, ["query"]),
      handler: (args) => {
        checkRepository(args);
        return mock.pullRequests().map(toPullRequest);
      },
    },
    {
      name: "pull_request_read",
      description:
        "Get a pull request, its diff, changed files, comments, reviews or status",
      parameters: params(
        {
          pullNumber: num,
          method: {
            type: "string",
            enum: [
              "get",
              "get_diff",
              "get_files",
              "get_comments",
              "get_reviews",
              "get_review_comments",
              "get_status",
            ],
          },
        },
        ["pullNumber"]
      ),
      handler: (args) => {
        checkRepository(args);
        const pr = getItem(mock, args, "pullNumber");
        switch (args.method) {
          case "get_diff":
            return pr.diff ?? "";
          case "get_files":
            return changedFiles(pr);
          case "get_comments":
          case "get_reviews":
          case "get_review_comments":
            return [];
          case "get_status":
            return { state: "success", statuses: [] };
          default:
            return toPullRequest(pr);
        }
      },
    },
  ];

  const write =
    (key?: string) =>
    (args: Record<string, unknown>): unknown => {
      checkRepository(args);
      if (key && args[key] !== undefined) {
        getItem(mock, args, key);
        return { number: mock.write(Number(args[key])) };
      }
      return { number: mock.write() };
    };

  const writeTools: ToolSpec[] = [
    {
      name: "issue_write",
      description: "Create or update an issue (title, body, labels, state)",
      parameters: params({
        method: { type: "string", enum: ["create", "update"] },
        issue_number: num,
        title: str,
        body: str,
        labels: { type: "array", items: str },
        state: { type: "string", enum: ["open", "closed"] },
      }),
      handler: write("issue_number"),
    },
    {
      name: "add_issue_comment",
      description: "Add a comment to an issue or pull request",
      parameters: params({ issue_number: num, body: str }, [
        "issue_number",
        "body",
      ]),
      handler: write("issue_number"),
    },
    {
      name: "create_pull_request",
      description: "Create a pull request",
      parameters: params({ title: str, body: str, head: str, base: str }, [
        "title",
        "head",
        "base",
      ]),
      handler: write(),
    },
    {
      name: "update_pull_request",
      description: "Update a pull request (title, body, state, base)",
      parameters: params(
        { pullNumber: num, title: str, body: str, state: str, base: str },
        ["pullNumber"]
      ),
      handler: write("pullNumber"),
    },
    {
      name: "merge_pull_request",
      description: "Merge a pull request",
      parameters: params({ pullNumber: num, merge_method: str }, [
        "pullNumber",
      ]),
      handler: write("pullNumber"),
    },
    {
      name: "pull_request_review_write",
      description: "Create, submit or delete a pull request review",
      parameters: params(
        {
          pullNumber: num,
          method: str,
          event: {
            type: "string",
            enum: ["APPROVE", "REQUEST_CHANGES", "COMMENT"],
          },
          body: str,
        },
        ["pullNumber", "method"]
      ),
      handler: write("pullNumber"),
    },
  ];

  return [...readTools, ...writeTools];
}

type GhResult = { status: number; stdout: string; stderr: string };

/** Flags of `gh issue|pr` that take a value */
const GH_VALUE_FLAGS = new Set([
  "-A",
  "-B",
  "-H",
  "-L",
  "-R",
  "-S",
  "-a",
  "-b",
  "-l",
  "-m",
  "-q",
  "-s",
  "-t",
  "--add-label",
  "--assignee",
  "--author",
  "--base",
  "--body",
  "--body-file",
  "--head",
  "--jq",
  "--json",
  "--label",
  "--limit",
  "--milestone",
  "--remove-label",
  "--repo",
  "--search",
  "--state",
  "--template",
  "--title",
]);

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

function ok(stdout: string): GhResult {
  return {
    status: 0,
    stdout: stdout.endsWith("\n") ? stdout : stdout + "\n",
    stderr: "",
  };
}

function fail(stderr: string): GhResult {
  return { status: 1, stdout: "", stderr: stderr + "\n" };
}

function parseGhArgs(args: string[]) {
  const flags = new Map<string, string | true>();
  const positionals: string[] = [];
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i];
    const eq = arg.indexOf("=");
    if (arg.startsWith("--") && eq > 0) {
      flags.set(arg.slice(0, eq), arg.slice(eq + 1));
    } else if (GH_VALUE_FLAGS.has(arg)) {
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

function toGhJson(item: Item, isPullRequest: boolean): Record<string, unknown> {
  const url = isPullRequest
    ? toPullRequest(item).html_url
    : toIssue(item).html_url;
  return {
    number: item.number,
    title: item.title,
    body: item.body,
    state: "OPEN",
    author: { login: item.author },
    labels: item.labels.map((name) => ({ name })),
    url,
    comments: [],
    ...(isPullRequest
      ? {
          isDraft: false,
          reviews: [],
          files: changedFiles(item).map(({ filename, ...rest }) => ({
            path: filename,
            ...rest,
          })),
        }
      : {}),
  };
}

function formatItems(
  items: Item[],
  isPullRequest: boolean,
  json: string | true | undefined
): string {
  if (typeof json === "string") {
    const fields = json.split(",");
    const objects = items.map((item) => {
      const all = toGhJson(item, isPullRequest);
      return Object.fromEntries(fields.map((f) => [f, all[f]]));
    });
    return JSON.stringify(objects, undefined, 2);
  }
  return items
    .map((item) => `${item.number}\t${item.title}\t${item.labels.join(", ")}`)
    .join("\n");
}

function formatItem(
  item: Item,
  isPullRequest: boolean,
  json: string | true | undefined
): string {
  if (typeof json === "string") {
    const all = toGhJson(item, isPullRequest);
    const fields = json.split(",");
    return JSON.stringify(
      Object.fromEntries(fields.map((f) => [f, all[f]])),
      undefined,
      2
    );
  }
  return [
    `title:\t${item.title}`,
    `state:\tOPEN`,
    `author:\t${item.author}`,
    `labels:\t${item.labels.join(", ")}`,
    `number:\t${item.number}`,
    "--",
    item.body,
  ].join("\n");
}

function ghApi(mock: GitHubMock, args: string[]): GhResult {
  let method: string | undefined;
  let hasFields = false;
  const positionals: string[] = [];
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i];
    if (arg === "-X" || arg === "--method") {
      method = args[++i]?.toUpperCase();
    } else if (/^-[fF]$|^--(raw-)?field$|^--input$/.test(arg)) {
      hasFields = true;
      ++i;
    } else if (
      arg === "-H" ||
      arg === "--header" ||
      arg === "-q" ||
      arg === "--jq"
    ) {
      if (arg === "-q" || arg === "--jq") {
        return fail("gh api: --jq is not supported in this environment");
      }
      ++i;
    } else if (!arg.startsWith("-")) {
      positionals.push(arg);
    }
  }

  const endpoint = (positionals[0] ?? "")
    .replace(/^\//, "")
    .replace("{owner}/{repo}", REPOSITORY)
    .split("?")[0];
  method = method ?? (hasFields ? "POST" : "GET");

  if (endpoint === "user") {
    return ok(JSON.stringify({ login: mock.viewer }));
  }

  const match = endpoint.match(
    /^repos\/([^/]+\/[^/]+)\/(issues|pulls)(?:\/(\d+))?(?:\/([a-z_]+))?/
  );
  if (!match || match[1].toLowerCase() !== REPOSITORY) {
    return fail(`gh: Not Found (HTTP 404)`);
  }

  const [, , kind, numberArg, sub] = match;
  const number = numberArg ? Number(numberArg) : undefined;
  if (method !== "GET") {
    if (number !== undefined && !mock.find(number)) {
      return fail(`gh: Not Found (HTTP 404)`);
    }
    return ok(JSON.stringify({ number: mock.write(number) }));
  }

  if (number === undefined) {
    return ok(
      JSON.stringify(
        kind === "pulls"
          ? mock.pullRequests().map(toPullRequest)
          : mock.issues().map(toIssue)
      )
    );
  }

  const found = mock.find(number);
  if (!found) {
    return fail(`gh: Not Found (HTTP 404)`);
  }
  switch (sub) {
    case undefined:
      return ok(
        JSON.stringify(
          found.isPullRequest ? toPullRequest(found.item) : toIssue(found.item)
        )
      );
    case "files":
      return ok(JSON.stringify(changedFiles(found.item)));
    case "labels":
      return ok(JSON.stringify(toIssue(found.item).labels));
    default:
      return ok("[]");
  }
}

/**
 * Runs a `gh` command against the mock.
 */
export function gh(mock: GitHubMock, args: string[]): GhResult {
  const [command, subcommand, ...rest] = args;
  if (command === "auth" && subcommand === "status") {
    return ok(`github.com\n  ✓ Logged in to github.com account ${mock.viewer}`);
  }
  if (command === "api") {
    return ghApi(mock, args.slice(1));
  }
  if (command !== "issue" && command !== "pr") {
    return fail(`gh ${command ?? ""}: not available in this environment`);
  }

  const { flags, positionals } = parseGhArgs(rest);
  const repo = flags.get("-R") ?? flags.get("--repo");
  if (typeof repo === "string" && repo.toLowerCase() !== REPOSITORY) {
    return fail(
      `GraphQL: Could not resolve to a Repository with the name '${repo}'.`
    );
  }
  const isQuery = subcommand === "list" || subcommand === "view";
  if (
    flags.has("--jq") ||
    flags.has("-q") ||
    flags.has("--template") ||
    (isQuery && flags.has("-t"))
  ) {
    return fail(
      `gh ${command} ${subcommand}: --jq and --template are not supported in this environment`
    );
  }
  if (flags.has("--web") || flags.has("-w")) {
    return fail(
      `gh ${command} ${subcommand}: --web is not available in this environment`
    );
  }

  const isPullRequest = command === "pr";
  const number = toNumber(positionals[0]);

  if (GH_WRITES[command].includes(subcommand)) {
    if (subcommand === "create") {
      const created = mock.write();
      const kind = isPullRequest ? "pull" : "issues";
      return ok(`https://github.com/${REPOSITORY}/${kind}/${created}`);
    }
    if (number === undefined || !mock.find(number)) {
      return fail(
        `GraphQL: Could not resolve to an issue or pull request with the number of ${positionals[0]}.`
      );
    }
    mock.write(number);
    return ok("");
  }

  const json = flags.get("--json");
  switch (subcommand) {
    case "list": {
      const items = isPullRequest ? mock.pullRequests() : mock.issues();
      const label = flags.get("--label") ?? flags.get("-l");
      const author = flags.get("--author") ?? flags.get("-A");
      const filtered = items.filter(
        (item) =>
          (typeof label !== "string" || item.labels.includes(label)) &&
          (typeof author !== "string" || item.author === author)
      );
      return ok(formatItems(filtered, isPullRequest, json));
    }

    case "view":
    case "diff":
    case "checks": {
      const found = number !== undefined ? mock.find(number) : undefined;
      // `gh issue view` also shows pull requests
      if (!found || (!found.isPullRequest && isPullRequest)) {
        return fail(
          `GraphQL: Could not resolve to an issue or pull request with the number of ${positionals[0]}.`
        );
      }
      if (subcommand === "diff") {
        return ok(found.item.diff ?? "");
      }
      if (subcommand === "checks") {
        return ok("no checks reported");
      }
      return ok(formatItem(found.item, found.isPullRequest, json));
    }

    default:
      return fail(
        `gh ${command} ${subcommand ?? ""}: not available in this environment`
      );
  }
}
