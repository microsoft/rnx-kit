import type { AgentCommand, HostItem, HostName } from "../types.ts";
import type { Session, SessionToolCall } from "./session.ts";

/**
 * A pull request, as needed to check out its changes.
 */
export type PullRequest = {
  /** ID the host uses to look up the pull request's agent sessions */
  id: string;
  /** Branch the pull request merges into */
  base: string;
  /** Ref to fetch the pull request's head commit from */
  head: string;
  /** Name of the pull request's branch */
  branch: string;
};

/**
 * Where the repository is hosted; looks up pull requests and the agent's
 * writes to the host.
 */
export type Host = {
  name: HostName;
  /** Returns the repository in a remote URL, or `undefined` if there is none */
  parseRepository(url: string): string | undefined;
  getPullRequest(
    repository: string,
    number: number
  ): Promise<PullRequest | undefined>;
  /** Reads the cloud agent sessions of a pull request; throws if it cannot */
  readSessions?(
    repository: string,
    pr: PullRequest,
    options: { copilotApiUrl?: string }
  ): Promise<Session>;
  /**
   * Returns references to the items, e.g. `#123`, that the agent wrote to,
   * and the writes whose item could not be determined
   */
  findWrites(
    repository: string,
    toolCalls: SessionToolCall[],
    commands: AgentCommand[]
  ): { modified: string[]; unknownWrites: string[] };
  /**
   * Looks up the user the session acted as, and the specified items. Values
   * that cannot be looked up are omitted.
   */
  lookUp(
    repository: string,
    refs: string[]
  ): Promise<{ actor?: string; items: HostItem[] }>;
};
