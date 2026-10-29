import type { AgentRun, EvalVars } from "../types.ts";
import { addWorktree, collectChanges, git } from "./checkout.ts";
import { lookUp, gitHubWrites } from "./github.ts";
import { readSession } from "./session.ts";
import { parseCommands } from "./shell.ts";

type ProviderConfig = {
  /**
   * GitHub repository the session worked on, as `owner/repo`; defaults to
   * the repository that `remote` points to
   */
  repository?: string;
  /** Remote to look up branches and the repository on; defaults to `origin` */
  remote?: string;
};

type ProviderOptions = {
  id?: string;
  config?: ProviderConfig;
};

type CallApiContext = {
  vars: Record<string, unknown>;
};

type Metadata = {
  copilotSession: string;
  branch: string;
  baseCommit: string;
  endCommit: string;
};

/** Sessions already replayed, keyed by the `copilotSession` var */
const runs = new Map<
  string,
  Promise<{ output: AgentRun; metadata: Metadata }>
>();

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

async function replay(
  id: string | undefined,
  config: ProviderConfig
): Promise<{ output: AgentRun; metadata: Metadata }> {
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

  // Paths in commands are relative to the session's checkout
  const commands = parseCommands(root, session.cwd, session.shellInputs);
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
    output: {
      commands,
      toolCalls,
      files,
      diff,
      finalMessage: requests[requests.length - 1]?.reply ?? "",
      requests,
      workdir,
      github,
    },
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
  ): Promise<{ output: AgentRun; metadata: Metadata } | { error: string }> {
    const { copilotSession } = (context?.vars ?? {}) as EvalVars;
    const key = copilotSession ?? "";
    let pending = runs.get(key);
    if (!pending) {
      pending = replay(copilotSession || undefined, this.config);
      runs.set(key, pending);
    }

    try {
      return await pending;
    } catch (e) {
      return { error: Error.isError(e) ? e.message : String(e) };
    }
  }
}
