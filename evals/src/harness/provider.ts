import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentRun, EvalVars } from "../types.ts";
import { collectChanges, git } from "./checkout.ts";
import { lookUp, modifiedNumbers } from "./github.ts";
import { readSession } from "./session.ts";
import { parseCommands } from "./shell.ts";

type ProviderOptions = {
  id?: string;
};

type CallApiContext = {
  vars: Record<string, unknown>;
};

type Metadata = { session: string; baseCommit: string };

/** Sessions already replayed, keyed by the `session` var */
const runs = new Map<
  string,
  Promise<{ output: AgentRun; metadata: Metadata }>
>();

function repositoryRoot(): string {
  return path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
}

async function replay(
  id: string | undefined
): Promise<{ output: AgentRun; metadata: Metadata }> {
  const session = readSession(repositoryRoot(), id);
  const { root, baseCommit } = session;
  if (!baseCommit) {
    throw new Error(`Session ${session.id} did not record its start commit`);
  }

  const branch = (await git(root, ["branch", "--show-current"])).trim();
  if (session.branch && branch !== session.branch) {
    throw new Error(
      `Session ${session.id} worked on '${session.branch}', but '${branch}' is checked out in ${root}`
    );
  }

  try {
    await git(root, ["cat-file", "-e", `${baseCommit}^{commit}`]);
  } catch (_) {
    throw new Error(
      `Start commit ${baseCommit} of session ${session.id} is not available; fetch it first`
    );
  }

  const commands = parseCommands(root, session.shellInputs);
  const toolCalls = session.toolCalls.map(({ name, arguments: args }) => ({
    name,
    arguments: args,
  }));
  const modified = modifiedNumbers(session.toolCalls, commands);
  const github = { modified, ...(await lookUp(modified)) };
  const { files, diff } = await collectChanges(root, baseCommit);
  const requests = session.requests;

  return {
    output: {
      commands,
      toolCalls,
      files,
      diff,
      finalMessage: requests[requests.length - 1]?.reply ?? "",
      requests,
      workdir: root,
      github,
    },
    metadata: { session: session.id, baseCommit },
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
    const { session } = (context?.vars ?? {}) as EvalVars;
    const key = session ?? "";
    let pending = runs.get(key);
    if (!pending) {
      pending = replay(session || undefined);
      runs.set(key, pending);
    }

    try {
      return await pending;
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }
}
