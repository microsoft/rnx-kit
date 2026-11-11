import { withRetry } from "@rnx-kit/tools-shell";
import { applyEvents, newSession } from "./session.ts";
import type { Session, SessionEvent } from "./session.ts";

/**
 * Copilot API; the endpoints below are undocumented and are the ones that
 * `gh agent-task` uses.
 */
const DEFAULT_API_URL = "https://api.githubcopilot.com";

/**
 * About 1 in 6 requests fails transiently; 5 attempts keep the chance of
 * losing the log of a pull request with ~40 sessions below 1%
 */
const MAX_ATTEMPTS = 5;

type ResourceResponse = {
  session_count?: number;
  sessions?: { id: string; last_updated_at: number }[];
};

type EventsResponse = {
  events: SessionEvent[];
  total: number;
};

function isTransient(status: number, body: string): boolean {
  // Requests intermittently fail with "400 unknown Copilot-Integration-Id"
  return (
    status === 429 ||
    status >= 500 ||
    (status === 400 && body.includes("unknown Copilot-Integration-Id"))
  );
}

function isUnauthorized(status: number, body: string): boolean {
  // Tokens issued by other GitHub Apps, e.g. `GITHUB_TOKEN` in workflows, are
  // rejected with "400 the Copilot-Integration-Id header does not match the
  // GitHub App that issued this installation access token"
  return (
    status === 401 ||
    status === 403 ||
    (status === 400 && body.includes("does not match the GitHub App"))
  );
}

async function getJSON<T>(url: string, token: string): Promise<T> {
  const { ok, status, body } = await withRetry(async () => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Copilot-Integration-Id": "copilot-4-cli",
      },
    });
    const { ok, status } = response;
    const body = (await response.text()).trim();
    // `withRetry` retries errors that are thrown
    if (!ok && isTransient(status, body)) {
      throw new Error(`${url}: ${status} ${body}`);
    }

    return { ok, status, body };
  }, MAX_ATTEMPTS);
  if (ok) {
    return JSON.parse(body) as T;
  }

  if (isUnauthorized(status, body)) {
    throw new Error(
      "the token cannot read Copilot cloud agent sessions; a user token with Copilot access is required"
    );
  }

  throw new Error(`${url}: ${status}${body ? ` ${body}` : ""}`);
}

/**
 * Reads the Copilot cloud agent sessions of a pull request, identified by
 * its database ID, as a single session. Each cloud session handles one user
 * request; later user messages in a session, e.g. to write the pull request
 * description, come from the agent itself and are dropped.
 */
export async function readGitHubSessions(
  repository: string,
  pullRequestId: string,
  token: string,
  apiUrl = DEFAULT_API_URL
): Promise<Session> {
  const url = `${apiUrl}/agents/resource/pull/${pullRequestId}`;
  const { session_count, sessions = [] } = await getJSON<ResourceResponse>(
    url,
    token
  ).catch((e: unknown) => {
    // The API also responds with 404 if the token cannot read the sessions
    throw Error.isError(e) && /: 404\b/.test(e.message)
      ? new Error(
          "no Copilot cloud agent sessions were found, or the token cannot read them"
        )
      : e;
  });
  if (sessions.length === 0) {
    throw new Error("no Copilot cloud agent sessions were found");
  }

  if (session_count && sessions.length < session_count) {
    throw new Error(
      `Pull request returned ${sessions.length} of ${session_count} sessions`
    );
  }

  // The cloud agent works in the default checkout of GitHub-hosted runners;
  // used if the first session does not say where it worked
  const name = repository.split("/")[1];
  const root = `/home/runner/work/${name}/${name}`;
  const ordered = sessions.toSorted(
    (a, b) => a.last_updated_at - b.last_updated_at
  );
  // Requesting all sessions concurrently makes some requests fail
  const logs: EventsResponse[] = [];
  for (const { id } of ordered) {
    logs.push(
      await getJSON<EventsResponse>(
        `${apiUrl}/agents/sessions/${id}/events`,
        token
      )
    );
  }

  const session = newSession(ordered.map(({ id }) => id).join(","), root);
  for (const [i, { events, total }] of logs.entries()) {
    if (events.length < total) {
      throw new Error(
        `Session ${ordered[i].id} returned ${events.length} of ${total} events`
      );
    }

    // Shares the shell inputs and tool calls of `session`
    const part: Session = { ...session, requests: [] };
    applyEvents(part, events);
    if (i === 0) {
      session.root = part.root;
      session.cwd = part.cwd;
    }
    if (part.requests[0]) {
      session.requests.push(part.requests[0]);
    }
  }

  return session;
}
