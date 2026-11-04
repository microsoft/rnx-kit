import { applyEvents, newSession } from "./session.ts";
import type { Session, SessionEvent } from "./session.ts";

/**
 * Copilot API; the endpoints below are undocumented and are the ones that
 * `gh agent-task` uses.
 */
const DEFAULT_API_URL = "https://api.githubcopilot.com";

type ResourceResponse = {
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
  for (let attempt = 1; ; ++attempt) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Copilot-Integration-Id": "copilot-4-cli",
      },
    });
    if (response.ok) {
      return (await response.json()) as T;
    }

    const { status } = response;
    const body = (await response.text()).trim();
    if (attempt < 3 && isTransient(status, body)) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      continue;
    }

    if (isUnauthorized(status, body)) {
      throw new Error(
        "the token cannot read Copilot cloud agent sessions; a user token with Copilot access is required"
      );
    }

    throw new Error(`${url}: ${status}${body ? ` ${body}` : ""}`);
  }
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
  const { sessions = [] } = await getJSON<ResourceResponse>(url, token).catch(
    (e: unknown) => {
      // The API also responds with 404 if the token cannot read the sessions
      throw Error.isError(e) && /: 404\b/.test(e.message)
        ? new Error(
            "no Copilot cloud agent sessions were found, or the token cannot read them"
          )
        : e;
    }
  );
  if (sessions.length === 0) {
    throw new Error("no Copilot cloud agent sessions were found");
  }

  // The cloud agent works in the default checkout of GitHub-hosted runners
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

    const part: Session = { ...session, requests: [] };
    applyEvents(part, events);
    if (part.requests[0]) {
      session.requests.push(part.requests[0]);
    }
  }
  return session;
}
