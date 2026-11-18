import { getBaseCommit, getDefaultBranch } from "@rnx-kit/tools-git";
import type { AgentRun, EvalVars } from "../types.ts";
import { addWorktree, collectChanges, git } from "./checkout.ts";
import { github } from "./github.ts";
import type { Host } from "./host.ts";
import { newSession, readSession } from "./session.ts";
import type { Session } from "./session.ts";
import { parseCommands } from "./shell.ts";

type ProviderConfig = {
  /**
   * Repository the session worked on, e.g. `owner/repo` on GitHub; defaults
   * to the repository that `remote` points to
   */
  repository?: string;
  /** Remote to look up branches and the repository on; defaults to `origin` */
  remote?: string;
  /**
   * Branch that pull requests merge into; defaults to the default branch of
   * `remote`. Changes already on it are not audited.
   */
  baseBranch?: string;
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

export async function resolveRepository(
  root: string,
  host: Host,
  { repository, remote = "origin" }: ProviderConfig
): Promise<string> {
  if (repository) {
    return repository;
  }

  try {
    const url = await git(root, ["remote", "get-url", remote]);
    const parsed = host.parseRepository(url);
    if (parsed) {
      return parsed;
    }
  } catch (_) {
    // Fall through to the error below
  }
  throw new Error(
    `Could not determine the repository from remote '${remote}'; set 'repository' in the provider config`
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

/**
 * Returns the commit to compare a session's changes with. That is where
 * `head`, on the session's `branch`, forked off the base branch, if the
 * session's start commit (`baseCommit`) precedes it, e.g. if the branch was
 * rebased onto, or recreated from, the base branch during the session.
 * Otherwise, or if the session worked on the base branch, it is `baseCommit`.
 * Commits that already landed on the base branch are thus not audited.
 */
export async function forkPoint(
  root: string,
  { remote = "origin", baseBranch }: ProviderConfig,
  branch: string,
  baseCommit: string,
  head: string
): Promise<string> {
  try {
    const options = { cwd: root, remote, head };
    const base = baseBranch
      ? `${remote}/${baseBranch}`
      : getDefaultBranch(undefined, options);
    if (base === `${remote}/${branch}`) {
      return baseCommit;
    }

    const mergeBase = getBaseCommit(base, undefined, options);
    if (!mergeBase) {
      return baseCommit;
    }

    await git(root, ["merge-base", "--is-ancestor", baseCommit, mergeBase]);
    return mergeBase;
  } catch (_) {
    return baseCommit;
  }
}

/**
 * Returns the branch the session ended on, given the branch it started on,
 * when it ran (`startTime` to `endTime`, in milliseconds since the epoch), and
 * the output of `git reflog show --date=unix --format=%gd%x09%gs`, which lists
 * the newest entry first. That is the branch the session last switched to, if
 * any, under the name it was last renamed to, even after the session.
 */
export function endBranch(
  reflog: string,
  startBranch: string | undefined,
  startTime: number,
  endTime: number
): string | undefined {
  const start = Math.floor(startTime / 1000);
  const end = Math.ceil(endTime / 1000);
  let branch = startBranch;
  for (const line of reflog.split("\n").reverse()) {
    // Refs cannot contain spaces; matching `\S+` keeps this linear
    const match = line.match(
      /^[^@]*@\{(\d+)\}\t(?:checkout: moving from \S+ to (\S+)|Branch: renamed refs\/heads\/(\S+) to refs\/heads\/(\S+))$/
    );
    const time = Number(match?.[1]);
    if (!match || time < start) {
      continue;
    }

    if (match[2] !== undefined) {
      if (time <= end) {
        branch = match[2];
      }
    } else if (match[3] === branch) {
      branch = match[4];
    }
  }
  return branch;
}

/**
 * Returns the branch the session ended on, according to the reflog of `HEAD`
 * in `root`, or else the branch it started on. Branch switches by others while
 * the session ran are attributed to the session.
 */
async function sessionBranch(
  root: string,
  { branch, startTime, endTime }: Session
): Promise<string | undefined> {
  if (startTime === undefined || endTime === undefined) {
    return branch;
  }

  try {
    const reflog = await git(root, [
      "reflog",
      "show",
      "--date=unix",
      "--format=%gd%x09%gs",
      "HEAD",
    ]);
    return endBranch(reflog, branch, startTime, endTime);
  } catch (_) {
    return branch;
  }
}

async function collectRun(
  host: Host,
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
  const { modified, unknownWrites } = host.findWrites(
    repository,
    session.toolCalls,
    commands
  );
  const hostWrites = {
    name: host.name,
    modified,
    unknownWrites,
    ...(await host.lookUp(repository, modified)),
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
    host: hostWrites,
  };
}

/**
 * Replays the Copilot cloud agent sessions of a pull request, and compares
 * its head with where it branched off its base branch. If the sessions cannot
 * be read, e.g. if the pull request was co-authored in a local session, the
 * token has no access, or the host has no cloud agent sessions, only the
 * changes are returned.
 */
async function replayPullRequest(
  host: Host,
  number: number,
  config: ProviderConfig
): Promise<Replay> {
  const root = (
    await git(process.cwd(), ["rev-parse", "--show-toplevel"])
  ).trim();
  const remote = config.remote ?? "origin";
  const repository = await resolveRepository(root, host, config);
  const pr = await host.getPullRequest(repository, number);
  if (!pr) {
    throw new Error(`Pull request #${number} was not found in ${repository}`);
  }

  await git(root, ["fetch", "--no-tags", "--", remote, pr.base]);
  const baseTip = (await git(root, ["rev-parse", "FETCH_HEAD"])).trim();
  await git(root, ["fetch", "--no-tags", "--", remote, pr.head]);
  const endCommit = (await git(root, ["rev-parse", "FETCH_HEAD"])).trim();
  const baseCommit = (
    await git(root, ["merge-base", baseTip, endCommit])
  ).trim();

  let session: Session;
  let missingLog: string | undefined;
  try {
    if (!host.readSessions) {
      throw new Error(`${host.name} has no cloud agent sessions`);
    }
    session = await host.readSessions(repository, pr, config);
  } catch (e) {
    missingLog = Error.isError(e) ? e.message : String(e);
    session = newSession("", root);
  }

  const workdir = await addWorktree(root, endCommit);
  return {
    output: await collectRun(host, repository, session, workdir, baseCommit),
    metadata: {
      copilotSession: session.id,
      branch: pr.branch,
      baseCommit,
      endCommit,
      pullRequest: number,
      ...(missingLog ? { missingLog } : {}),
    },
  };
}

async function replay(
  host: Host,
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

  // The session may have started on another branch, e.g. `main`, and
  // switched to the branch of its pull request later
  const branch = await sessionBranch(root, session);
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
  const repository = await resolveRepository(root, host, config);
  let endCommit = "WORKING_TREE";
  const current = (await git(root, ["branch", "--show-current"])).trim();
  if (current !== branch) {
    endCommit = await resolveBranch(root, remote, branch);
    if (!endCommit) {
      throw new Error(
        `Branch '${branch}' of session ${session.id} was not found locally or on '${remote}'`
      );
    }
  }

  const workingTree = endCommit === "WORKING_TREE";
  try {
    await git(root, [
      "merge-base",
      "--is-ancestor",
      baseCommit,
      workingTree ? "HEAD" : endCommit,
    ]);
  } catch (_) {
    throw new Error(
      `Branch '${branch}' does not contain start commit ${baseCommit} of session ${session.id}`
    );
  }

  const head = workingTree ? "HEAD" : endCommit;
  const forkCommit = await forkPoint(root, config, branch, baseCommit, head);
  const workdir = workingTree ? root : await addWorktree(root, endCommit);
  return {
    output: await collectRun(host, repository, session, workdir, forkCommit),
    metadata: {
      copilotSession: session.id,
      branch,
      baseCommit: forkCommit,
      endCommit,
    },
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
    if (pullRequest && !/^[1-9]\d*$/.test(String(pullRequest))) {
      throw new Error(`Invalid pull request number: ${pullRequest}`);
    }

    const number = Number(pullRequest);
    const key = number ? `#${number}` : (copilotSession ?? "");
    let pending = runs.get(key);
    if (!pending) {
      pending = number
        ? replayPullRequest(github, number, this.config)
        : replay(github, copilotSession || undefined, this.config);
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
