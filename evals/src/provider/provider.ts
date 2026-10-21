import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentRun, EvalVars } from "../types.ts";
import { addWorktree, collectChanges, git } from "./checkout.ts";
import { lookUp, modifiedNumbers } from "./github.ts";
import { readSession } from "./session.ts";
import { parseCommands } from "./shell.ts";

type ProviderOptions = {
  id?: string;
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

function repositoryRoot(): string {
  return path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
}

async function resolveBranch(root: string, branch: string): Promise<string> {
  for (const ref of [`refs/heads/${branch}`, `refs/remotes/origin/${branch}`]) {
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
  id: string | undefined
): Promise<{ output: AgentRun; metadata: Metadata }> {
  const session = readSession(repositoryRoot(), id);
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
  // (local, or else on `origin`) in a temporary worktree.
  let workdir = root;
  let endCommit = "WORKING_TREE";
  const current = (await git(root, ["branch", "--show-current"])).trim();
  if (current !== branch) {
    endCommit = await resolveBranch(root, branch);
    if (!endCommit) {
      throw new Error(
        `Branch '${branch}' of session ${session.id} was not found locally or on 'origin'`
      );
    }
    workdir = await addWorktree(root, endCommit);
  }

  // Paths in commands are relative to the session's checkout
  const commands = parseCommands(root, session.shellInputs);
  const toolCalls = session.toolCalls.map(({ name, arguments: args }) => ({
    name,
    arguments: args,
  }));
  const modified = modifiedNumbers(session.toolCalls, commands);
  const github = { modified, ...(await lookUp(modified, branch)) };
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

  constructor({ id }: ProviderOptions = {}) {
    this.providerId = id ?? "copilot-session";
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
      pending = replay(copilotSession || undefined);
      runs.set(key, pending);
    }

    try {
      return await pending;
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }
}
