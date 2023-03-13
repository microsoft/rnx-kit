import * as github from "./remotes/github.js";
import type { Remote, RepositoryInfo } from "./types.js";

export function getRemoteInfo(): [Remote, RepositoryInfo] {
  const githubRepo = github.getRepositoryInfo();
  if (githubRepo) {
    return [github, githubRepo];
  }

  throw new Error("Unsupported repository");
}
