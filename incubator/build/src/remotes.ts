import * as github from "./remotes/github.ts";
import type { Remote, RepositoryInfo } from "./types.ts";

export function getRemoteInfo(): [Remote, RepositoryInfo] {
  const githubRepo = github.getRepositoryInfo();
  if (githubRepo) {
    return [github, githubRepo];
  }

  throw new Error("Unsupported repository");
}
