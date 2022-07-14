import * as github from "./remotes/github";
import type { Remote, RepositoryInfo } from "./types";

export function getRemoteInfo(): [Remote, RepositoryInfo] {
  const githubRepo = github.getRepositoryInfo();
  if (githubRepo) {
    return [github, githubRepo];
  }

  throw new Error("Unsupported repository");
}
