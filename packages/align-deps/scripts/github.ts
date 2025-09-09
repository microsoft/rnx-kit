import type { OctokitOptions } from "@octokit/core";
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { info } from "@rnx-kit/console";
import type { Preset } from "../src/types";

type GitHubClient = Octokit & ReturnType<typeof restEndpointMethods>;

const BASE_GITHUB_PARAMS = {
  owner: "microsoft",
  repo: "rnx-kit",
};

const DEFAULT_BRANCH = "rnx-align-deps/main";

const MAGIC_KEYWORD = "@microsoft-react-native-sdk";

function isArray<T>(a: T[] | null | undefined): a is T[] {
  return Array.isArray(a) && a.length > 0;
}

export function createGitHubClient(options: OctokitOptions = {}): GitHubClient {
  return new (Octokit.plugin(restEndpointMethods))({
    auth: process.env["GITHUB_TOKEN"],
    ...options,
  });
}

export function fetchPullRequests(
  octokit: GitHubClient,
  head = `${BASE_GITHUB_PARAMS.owner}:${DEFAULT_BRANCH}`
) {
  return octokit.rest.pulls.list({
    ...BASE_GITHUB_PARAMS,
    state: "open",
    head,
    base: "main",
    per_page: 1,
    page: 1,
  });
}

export async function fetchPullRequestFeedback(
  octokit: GitHubClient,
  branch = DEFAULT_BRANCH
) {
  const head = `${BASE_GITHUB_PARAMS.owner}:${branch}`;

  const pullRequests = await fetchPullRequests(octokit, head);
  if (!isArray(pullRequests.data)) {
    info(`No pull requests found for '${head}'`);
    return;
  }

  const pr = pullRequests.data[0];
  const reviewers = pr.requested_reviewers?.map((user) => user.id);
  if (!isArray(reviewers)) {
    info(`No reviewers found for pull request #${pr.number}`);
    return;
  }

  const comments = await octokit.rest.issues.listComments({
    ...BASE_GITHUB_PARAMS,
    issue_number: pr.number,
  });

  for (const comment of comments.data) {
    if (
      !reviewers.includes(comment.user?.id || -1) ||
      !comment.body?.startsWith(MAGIC_KEYWORD)
    ) {
      continue;
    }

    const m = comment.body.match(/```json([^]*?)```/);
    if (!m) {
      continue;
    }

    try {
      return JSON.parse(m[1]) as Preset;
    } catch (e) {
      info(`Failed to parse JSON from comment: ${e.message}`);
      continue;
    }
  }

  info(`No feedback found for pull request #${pr.number}`);
}
