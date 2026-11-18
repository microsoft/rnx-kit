import { makeCommand } from "@rnx-kit/tools-shell";
import { withoutExecutablePath } from "../common.ts";
import type { AgentCommand, HostItem } from "../types.ts";
import type { Host, PullRequest } from "./host.ts";
import type { SessionToolCall } from "./session.ts";

const API_URL = "https://dev.azure.com";
const API_VERSION = "api-version=7.1";

/** ID of Azure DevOps when requesting tokens from Microsoft Entra ID */
const RESOURCE_ID = "499b84ac-1321-427f-aa17-267ca6975798";

/** ID that Azure DevOps reports for anonymous users */
const ANONYMOUS_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const GUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

const UNKNOWN = "unknown";

/**
 * A write to Azure DevOps: references to the items written to, `UNKNOWN` if
 * they could not be determined, or `undefined` if not a write to an existing
 * item.
 */
type Write = string[] | typeof UNKNOWN | undefined;

type Repository = { org: string; project: string; repo: string };

function splitRepository(repository: string): Repository {
  const parts = repository.split("/");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error(
      `Invalid Azure DevOps repository '${repository}'; expected 'organization/project/repository'`
    );
  }

  const [org, project, repo] = parts;
  return { org, project, repo };
}

function decode(component: string): string | undefined {
  try {
    return decodeURIComponent(component);
  } catch (_) {
    return undefined;
  }
}

/**
 * Returns the `organization/project/repository` part of an Azure DevOps remote
 * URL, e.g. `https://dev.azure.com/org/project/_git/repo`,
 * `https://org.visualstudio.com/project/_git/repo` or
 * `git@ssh.dev.azure.com:v3/org/project/repo`, or `undefined` if it is not
 * one. Names are percent-decoded.
 */
export function parseRepository(url: string): string | undefined {
  const trimmed = url.trim();
  const https = trimmed.match(
    /^https?:\/\/(?:[^@/]+@)?(?:dev\.azure\.com\/([^/]+)|([^./@]+)\.visualstudio\.com(?:\/DefaultCollection)?)\/(?:([^/]+)\/)?_git\/([^/?#]+)\/?$/i
  );
  const ssh = trimmed.match(
    /^(?:ssh:\/\/)?[^@/]+@(?:ssh\.dev\.azure\.com|vs-ssh\.visualstudio\.com)(?::22)?[:/]v3\/([^/]+)\/([^/]+)\/([^/]+?)\/?$/i
  );
  let names: (string | undefined)[];
  if (https) {
    // Without a project, the project has the same name as the repository
    const [, org1, org2, project, repo] = https;
    names = [org1 ?? org2, project ?? repo, repo].map(decode);
  } else if (ssh) {
    names = ssh.slice(1).map(decode);
  } else {
    return undefined;
  }

  return names.every((name) => name && !name.includes("/"))
    ? names.join("/")
    : undefined;
}

function isName(expected: string, value: unknown): boolean {
  // Names are case-insensitive; IDs cannot be compared without a lookup
  return (
    typeof value !== "string" ||
    GUID.test(value) ||
    value.toLowerCase() === expected.toLowerCase()
  );
}

function toId(value: unknown): number | undefined {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function toRefs(prefix: "!" | "#", ...values: unknown[]): string[] {
  const refs: string[] = [];
  for (const value of values) {
    const id = toId(value);
    if (id) {
      refs.push(`${prefix}${id}`);
    }
  }
  return refs;
}

function ids(items: unknown, key: string): unknown[] {
  return Array.isArray(items)
    ? items.map((item: Record<string, unknown> | null) => item?.[key])
    : [];
}

/**
 * Azure DevOps MCP tools that write, by name without the server prefix, and
 * the references to the items each action writes to. Actions that create
 * items are not listed.
 */
const MCP_WRITES: Record<
  string,
  Record<string, (args: Record<string, unknown>) => string[]>
> = {
  repo_pull_request_write: {
    update: (args) => toRefs("!", args["pullRequestId"]),
    update_reviewers: (args) => toRefs("!", args["pullRequestId"]),
    vote: (args) => toRefs("!", args["pullRequestId"]),
  },
  repo_pull_request_thread_write: {
    create: (args) => toRefs("!", args["pullRequestId"]),
    reply: (args) => toRefs("!", args["pullRequestId"]),
    update: (args) => toRefs("!", args["pullRequestId"]),
    update_status: (args) => toRefs("!", args["pullRequestId"]),
  },
  wit_work_item_write: {
    update: (args) => toRefs("#", args["id"]),
    update_batch: (args) => toRefs("#", ...ids(args["batchUpdates"], "id")),
    add_child: (args) => toRefs("#", args["parentId"]),
  },
  wit_work_item_comment_write: {
    add: (args) => toRefs("#", args["workItemId"]),
    update: (args) => toRefs("#", args["workItemId"]),
  },
  wit_work_item_link_write: {
    link: (args) => toRefs("#", ...ids(args["updates"], "id")),
    unlink: (args) => toRefs("#", args["id"]),
    link_to_pull_request: (args) => [
      ...toRefs("#", args["workItemId"]),
      ...toRefs("!", args["pullRequestId"]),
    ],
    add_artifact_link: (args) => toRefs("#", args["workItemId"]),
  },
  wit_work_item_attachment_link: {
    "": (args) => toRefs("#", args["workItemId"]),
  },
  testplan_test_case_write: {
    update_steps: (args) => toRefs("#", args["id"]),
  },
};

function mcpWrite(
  { project, repo }: Repository,
  { name, arguments: args, serverTool }: SessionToolCall
): Write {
  // MCP clients prefix tool names with the server's name, which users choose
  const tool = Object.keys(MCP_WRITES).find((tool) =>
    new RegExp(`(?:^|[-_])${tool}$`).test(serverTool ?? name)
  );
  if (!tool) {
    return undefined;
  }

  const action = typeof args["action"] === "string" ? args["action"] : "";
  const writes = MCP_WRITES[tool][action];
  if (!writes) {
    return undefined;
  }

  // Only pull requests are scoped to a repository; work item IDs are unique
  // in the organization
  if (
    tool.startsWith("repo_") &&
    (!isName(project, args["project"]) || !isName(repo, args["repositoryId"]))
  ) {
    return undefined;
  }

  const written = writes(args);
  return written.length > 0 ? written : UNKNOWN;
}

/**
 * Returns the values of the specified options, e.g. `--id 1` or `--id=1`, in
 * the arguments of an `az` command. Options may take several values.
 */
function azOptions(args: string[]): Record<string, string[]> {
  const options: Record<string, string[]> = {};
  let current: string[] | undefined;
  for (const arg of args) {
    if (arg.startsWith("-")) {
      const [name, ...value] = arg.split("=");
      current = options[name] ?? [];
      options[name] = current;
      if (value.length > 0) {
        current.push(value.join("="));
        current = undefined;
      }
    } else {
      current?.push(arg);
    }
  }
  return options;
}

/** `az repos pr` and `az boards work-item` subcommands that only read */
const AZ_READS = ["checkout", "list", "list-type", "show"];

/**
 * Returns the items written to by an `az` command, given the arguments after
 * `az`, e.g. `az repos pr update --id 1` or `az boards work-item update --id 1`.
 */
function azWrite(org: string, args: string[]): Write {
  // Commands precede their options
  const end = args.findIndex((arg) => arg.startsWith("-"));
  const words = end < 0 ? args : args.slice(0, end);
  const options = azOptions(args.slice(words.length));
  const orgUrl = options["--org"]?.[0] ?? options["--organization"]?.[0];
  if (
    orgUrl &&
    parseOrganization(orgUrl)?.toLowerCase() !== org.toLowerCase()
  ) {
    return undefined;
  }

  const [group, command, subcommand] = words;
  if (group === "devops" && command === "invoke") {
    return azInvokeWrite(options);
  }

  const isPullRequest = group === "repos" && command === "pr";
  const isWorkItem = group === "boards" && command === "work-item";
  const action = words[words.length - 1];
  if (
    (!isPullRequest && !isWorkItem) ||
    words.length < 3 ||
    action === "create" ||
    AZ_READS.includes(action)
  ) {
    return undefined;
  }

  const id = options["--id"]?.[0];
  const written = isPullRequest
    ? [
        ...toRefs("!", id),
        // `az repos pr work-item add --id 1 --work-items 2 3` links all three
        ...(subcommand === "work-item"
          ? toRefs("#", ...(options["--work-items"] ?? []))
          : []),
      ]
    : toRefs("#", id);
  return written.length > 0 ? written : UNKNOWN;
}

/**
 * Returns the items written to by `az devops invoke`, which reads unless
 * `--http-method` is set to another method than `GET`.
 */
function azInvokeWrite(options: Record<string, string[]>): Write {
  const method = options["--http-method"]?.[0]?.toUpperCase() ?? "GET";
  if (method === "GET") {
    return undefined;
  }

  const params = Object.fromEntries(
    (options["--route-parameters"] ?? []).map((param) => {
      const [key, ...value] = param.split("=");
      return [key.toLowerCase(), value.join("=")];
    })
  );
  const area = options["--area"]?.[0]?.toLowerCase();
  const written = [
    ...toRefs("!", params["pullrequestid"]),
    ...(area === "wit"
      ? toRefs("#", params["id"] ?? params["workitemid"])
      : []),
  ];
  return written.length > 0 ? written : UNKNOWN;
}

/**
 * Returns the organization in an organization URL, e.g.
 * `https://dev.azure.com/org` or `https://org.visualstudio.com`.
 */
function parseOrganization(url: string): string | undefined {
  const match = url.match(
    /^https?:\/\/(?:[^@/]+@)?(?:dev\.azure\.com\/([^/]+)|([^./@]+)\.visualstudio\.com)\/?/i
  );
  return match ? decode(match[1] ?? match[2]) : undefined;
}

/**
 * Returns the pull requests (`!123`) and work items (`#123`) that the agent
 * wrote to in the organization of `repository` (`org/project/repo`) through
 * the Azure DevOps MCP tools or the `az` CLI:
 *
 * - `modified`: references to the items written to. Pull requests in other
 *   repositories are not included if the repository is named. Writes that
 *   create items are not included.
 * - `unknownWrites`: writes whose item could not be determined, e.g.
 *   `az devops invoke` calls without a pull request or work item ID.
 */
export function azureDevOpsWrites(
  repository: string,
  toolCalls: SessionToolCall[],
  commands: AgentCommand[]
): { modified: string[]; unknownWrites: string[] } {
  const repo = splitRepository(repository);
  const modified = new Set<string>();
  const unknownWrites: string[] = [];
  const add = (write: Write, description: string) => {
    if (write === UNKNOWN) {
      unknownWrites.push(description);
    } else if (write) {
      for (const ref of write) {
        modified.add(ref);
      }
    }
  };

  for (const call of toolCalls) {
    add(mcpWrite(repo, call), `${call.name} ${JSON.stringify(call.arguments)}`);
  }

  for (const { argv } of commands) {
    const [executable = "", ...args] = argv;
    if (withoutExecutablePath(executable) === "az") {
      add(azWrite(repo.org, args), argv.join(" "));
    }
  }

  // Pull requests (`!`) before work items (`#`), each by ID
  const sorted = Array.from(modified).sort(
    (a, b) =>
      a.charCodeAt(0) - b.charCodeAt(0) ||
      Number(a.substring(1)) - Number(b.substring(1))
  );
  return { modified: sorted, unknownWrites };
}

const az = makeCommand(process.platform === "win32" ? "az.cmd" : "az", {
  timeout: 30 * 1000,
});

/**
 * Returns the `Authorization` header to call Azure DevOps with: a personal
 * access token in `AZURE_DEVOPS_EXT_PAT`, or else a token from the Azure CLI.
 * Without either, Azure DevOps is called anonymously, which only works for
 * public projects.
 */
async function getAuthorization(): Promise<string | undefined> {
  const pat = process.env["AZURE_DEVOPS_EXT_PAT"];
  if (pat) {
    return `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
  }

  try {
    const { stdout, status } = await az(
      "account",
      "get-access-token",
      "--resource",
      RESOURCE_ID,
      "--query",
      "accessToken",
      "--output",
      "tsv"
    );
    const token = stdout.trim();
    return status === 0 && token ? `Bearer ${token}` : undefined;
  } catch (_) {
    return undefined;
  }
}

async function getJSON<T>(
  url: string,
  auth: string | undefined
): Promise<T | undefined> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      // Unauthorized requests are redirected to the sign-in page
      redirect: "manual",
      signal: AbortSignal.timeout(30 * 1000),
    });
    return response.ok ? ((await response.json()) as T) : undefined;
  } catch (_) {
    return undefined;
  }
}

function repositoryUrl(
  apiUrl: string,
  { org, project, repo }: Repository
): string {
  const [o, p, r] = [org, project, repo].map(encodeURIComponent);
  return `${apiUrl}/${o}/${p}/_apis/git/repositories/${r}`;
}

type GitPullRequest = {
  title: string;
  sourceRefName: string;
  targetRefName: string;
  lastMergeSourceCommit?: { commitId: string };
  createdBy?: { id: string };
};

/**
 * Looks up a pull request in `repository` (`org/project/repo`). Its head is
 * fetched by commit, since Azure DevOps only has merge refs for pull requests
 * that are active and can be merged.
 */
export async function getPullRequest(
  repository: string,
  number: number,
  apiUrl = API_URL
): Promise<PullRequest | undefined> {
  const url = `${repositoryUrl(apiUrl, splitRepository(repository))}/pullrequests/${number}?${API_VERSION}`;
  const pr = await getJSON<GitPullRequest>(url, await getAuthorization());
  const head = pr?.lastMergeSourceCommit?.commitId;
  if (!pr || !head) {
    return undefined;
  }

  return {
    id: String(number),
    base: pr.targetRefName,
    head,
    branch: pr.sourceRefName.replace(/^refs\/heads\//, ""),
  };
}

type WorkItem = {
  fields: {
    "System.Title": string;
    "System.CreatedBy"?: { id: string };
  };
};

/**
 * Looks up the authenticated user, i.e. the user the session acted as, and
 * the specified pull requests (`!123`) in `repository` (`org/project/repo`),
 * and work items (`#123`) in its project. Users are identified by their ID.
 * Only reads from Azure DevOps. Values that cannot be looked up are omitted.
 */
export async function lookUp(
  repository: string,
  refs: string[],
  apiUrl = API_URL
): Promise<{ actor?: string; items: HostItem[] }> {
  const repo = splitRepository(repository);
  const [o, p] = [repo.org, repo.project].map(encodeURIComponent);
  const auth = await getAuthorization();
  const connection = await getJSON<{ authenticatedUser?: { id?: string } }>(
    `${apiUrl}/${o}/_apis/connectionData`,
    auth
  );
  const items = await Promise.all(
    refs.map(async (ref): Promise<HostItem | undefined> => {
      const id = ref.substring(1);
      if (ref.startsWith("!")) {
        const pr = await getJSON<GitPullRequest>(
          `${repositoryUrl(apiUrl, repo)}/pullrequests/${id}?${API_VERSION}`,
          auth
        );
        return pr?.createdBy
          ? { ref, title: pr.title, author: pr.createdBy.id }
          : undefined;
      }

      const item = await getJSON<WorkItem>(
        `${apiUrl}/${o}/${p}/_apis/wit/workitems/${id}?${API_VERSION}`,
        auth
      );
      const author = item?.fields["System.CreatedBy"]?.id;
      return item && author
        ? { ref, title: item.fields["System.Title"], author }
        : undefined;
    })
  );
  const actor = connection?.authenticatedUser?.id;
  return {
    ...(actor && actor !== ANONYMOUS_ID ? { actor } : {}),
    items: items.filter((item) => item !== undefined),
  };
}

export const azureDevOps: Host = {
  name: "azure-devops",
  parseRepository,
  getPullRequest: (repository, number) => getPullRequest(repository, number),
  findWrites: azureDevOpsWrites,
  lookUp: (repository, refs) => lookUp(repository, refs),
};
