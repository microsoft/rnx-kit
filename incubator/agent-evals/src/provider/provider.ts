import type { AgentRun, EvalVars } from "../types.ts";
import { addWorktree, collectChanges, git } from "./checkout.ts";
import { readCloudSessions } from "./cloud.ts";
import { ghJson, lookUp, gitHubWrites } from "./github.ts";
import { getToken } from "./grader.ts";
import { readSession } from "./session.ts";
import type { Session } from "./session.ts";
import { parseCommands } from "./shell.ts";

type ProviderConfig = {
  /**
   * GitHub repository the session worked on, as `owner/repo`; defaults to
   * the repository that `remote` points to
   */
  repository?: string;
  /** Remote to look up branches and the repository on; defaults to `origin` */
  remote?: string;
  /** Copilot API to read cloud agent sessions from */
  copilotApiUrl?: string;
};

type ProviderOptions = {
  id?: string;
  config?: ProviderConfig;
};

type CallApiContext = {
  vars: Record<string, unknown>;
  test?: { metadata?: Record<string, unknown> };
};

type Metadata = {
  copilotSession: string;
  branch: string;
  baseCommit: string;
  endCommit: string;
  pullRequest?: number;
  /** Why the session log could not be read; only the diff is audited */
  missingLog?: string;
};

type Replay = { output: AgentRun; metadata: Metadata };

/** Sessions already replayed, keyed by the `copilotSession` or `pullRequest` var */
const runs = new Map<string, Promise<Replay>>();

/**
 * Returns the `owner/repo` part of a GitHub remote URL, e.g.
 * `https://github.com/owner/repo.git` or `git@github.com:owner/repo.git`.
 */
export function parseRepository(url: string): string | undefined {
  return url.trim().match(/[/:]([^/:]+\/[^/]+?)(?:\.git)?\/?$/)?.[1];
}

export async function resolveRepository(
  root: string,
  { repository, remote = "origin" }: ProviderConfig
): Promise<string> {
  if (repository) {
    return repository;
  }

  try {
    const url = await git(root, ["remote", "get-url", remote]);
    const parsed = parseRepository(url);
    if (parsed) {
      return parsed;
    }
  } catch (_) {
    // Fall through to the error below
  }
  throw new Error(
    `Could not determine the GitHub repository from remote '${remote}'; set 'repository' in the provider config`
  );
}

async function resolveBranch(
  root: string,
  remote: string,
  branch: string
): Promise<string> {
  for (const ref of [
    `refs/heads/${branch}`,
    `refs/remotes/${remote}/${branch}`,
  ]) {
    try {
      return (
        await git(root, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`])
      ).trim();
    } catch (_) {
      // Try the next ref
    }
  }
  return "";
}

async function collectRun(
  repository: string,
  session: Pick<
    Session,
    "root" | "cwd" | "shellInputs" | "toolCalls" | "requests"
  >,
  workdir: string,
  baseCommit: string
): Promise<AgentRun> {
  // Paths in commands are relative to the session's checkout
  const commands = parseCommands(
    session.root,
    session.cwd,
    session.shellInputs
  );
  const toolCalls = session.toolCalls.map(({ name, arguments: args }) => ({
    name,
    arguments: args,
  }));
  const { modified, unknownWrites } = gitHubWrites(
    repository,
    session.toolCalls,
    commands
  );
  const github = {
    modified,
    unknownWrites,
    ...(await lookUp(repository, modified)),
  };
  const { files, diff } = await collectChanges(workdir, baseCommit);
  const requests = session.requests;
  return {
    commands,
    toolCalls,
    files,
    diff,
    finalMessage: requests[requests.length - 1]?.reply ?? "",
    requests,
    workdir,
    github,
  };
}

/**
 * Replays the Copilot cloud agent sessions of a pull request, and compares
 * its head with where it branched off its base branch. If the sessions cannot
 * be read, e.g. if the pull request was co-authored in a local session or the
 * token has no access, only the changes are returned.
 */
async function replayPullRequest(
  number: number,
  config: ProviderConfig
): Promise<Replay> {
  const root = (
    await git(process.cwd(), ["rev-parse", "--show-toplevel"])
  ).trim();
  const remote = config.remote ?? "origin";
  const repository = await resolveRepository(root, config);
  const pr = await ghJson<{
    baseRefName: string;
    headRefName: string;
    fullDatabaseId: string;
  }>([
    "pr",
    "view",
    String(number),
    "--repo",
    repository,
    "--json",
    "baseRefName,headRefName,fullDatabaseId",
  ]);
  if (!pr) {
    throw new Error(`Pull request #${number} was not found in ${repository}`);
  }

  await git(root, ["fetch", "--no-tags", remote, pr.baseRefName]);
  const baseTip = (await git(root, ["rev-parse", "FETCH_HEAD"])).trim();
  await git(root, ["fetch", "--no-tags", remote, `refs/pull/${number}/head`]);
  const endCommit = (await git(root, ["rev-parse", "FETCH_HEAD"])).trim();
  const baseCommit = (
    await git(root, ["merge-base", baseTip, endCommit])
  ).trim();

  let session: Session;
  let missingLog: string | undefined;
  try {
    session = await readCloudSessions(
      repository,
      pr.fullDatabaseId,
      getToken(),
      config.copilotApiUrl
    );
  } catch (e) {
    missingLog = Error.isError(e) ? e.message : String(e);
    session = {
      id: "",
      root,
      cwd: root,
      shellInputs: [],
      toolCalls: [],
      requests: [],
    };
  }

  const workdir = await addWorktree(root, endCommit);
  return {
    output: await collectRun(repository, session, workdir, baseCommit),
    metadata: {
      copilotSession: session.id,
      branch: pr.headRefName,
      baseCommit,
      endCommit,
      pullRequest: number,
      ...(missingLog ? { missingLog } : {}),
    },
  };
}

async function replay(
  id: string | undefined,
  config: ProviderConfig
): Promise<Replay> {
  const cwdRoot = (
    await git(process.cwd(), ["rev-parse", "--show-toplevel"])
  ).trim();
  const session = readSession(cwdRoot, id);
  const { root, baseCommit } = session;
  if (!baseCommit) {
    throw new Error(`Session ${session.id} did not record its start commit`);
  }

  const { branch } = session;
  if (!branch) {
    throw new Error(`Session ${session.id} did not record its branch`);
  }

  try {
    await git(root, ["cat-file", "-e", `${baseCommit}^{commit}`]);
  } catch (_) {
    throw new Error(
      `Start commit ${baseCommit} of session ${session.id} is not available; fetch it first`
    );
  }

  // The event log does not record the files the session ended with, so they
  // are taken from the session's branch: the working tree, including
  // uncommitted changes, if the branch is checked out, otherwise its tip
  // (local, or else on the remote) in a temporary worktree.
  const remote = config.remote ?? "origin";
  const repository = await resolveRepository(root, config);
  let workdir = root;
  let endCommit = "WORKING_TREE";
  const current = (await git(root, ["branch", "--show-current"])).trim();
  if (current !== branch) {
    endCommit = await resolveBranch(root, remote, branch);
    if (!endCommit) {
      throw new Error(
        `Branch '${branch}' of session ${session.id} was not found locally or on '${remote}'`
      );
    }
    workdir = await addWorktree(root, endCommit);
  }

  return {
    output: await collectRun(repository, session, workdir, baseCommit),
    metadata: { copilotSession: session.id, branch, baseCommit, endCommit },
  };
}

/**
 * promptfoo provider that replays a Copilot session from its event log and
 * returns an `AgentRun`: what the agent ran and called, and what changed in
 * the session's checkout since the session started. Each session is read
 * once and shared by all tests.
 */
// oxlint-disable-next-line import/no-default-export
export default class CopilotSessionProvider {
  private readonly providerId: string;
  private readonly config: ProviderConfig;

  constructor({ id, config = {} }: ProviderOptions = {}) {
    this.providerId = id ?? "copilot-session";
    this.config = config;
  }

  id(): string {
    return this.providerId;
  }

  async callApi(
    _prompt: string,
    context?: CallApiContext
  ): Promise<Replay | { error: string }> {
    const { copilotSession, pullRequest } = (context?.vars ?? {}) as EvalVars;
    const number = Number(pullRequest);
    const key = number ? `#${number}` : (copilotSession ?? "");
    let pending = runs.get(key);
    if (!pending) {
      pending = number
        ? replayPullRequest(number, this.config)
        : replay(copilotSession || undefined, this.config);
      runs.set(key, pending);
    }

    try {
      const run = await pending;
      const { missingLog } = run.metadata;
      if (missingLog && context?.test?.metadata?.["requires"] === "session") {
        return {
          error: `Skipped: requires the session log, which could not be read: ${missingLog}`,
        };
      }
      return run;
    } catch (e) {
      return { error: Error.isError(e) ? e.message : String(e) };
    }
  }
}
