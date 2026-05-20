import { git } from "./git.ts";

/**
 * Returns all files that changed since a given branch/commit.
 */
export function getChangedFiles(since: string): string[] {
  const changedFiles = git("diff", "--name-only", since);
  if (!changedFiles) {
    return [];
  }
  return changedFiles.split("\n");
}
