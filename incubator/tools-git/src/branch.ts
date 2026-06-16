import { DEFAULT_BRANCH, git } from "./git.ts";
import { verifyRef } from "./ref.ts";

/**
 * Returns the default branch for the current repository.
 * @param [fallback=DEFAULT_BRANCH] Fallback branch to use when `origin/HEAD` does not exist
 */
export function getDefaultBranch(
  fallback = DEFAULT_BRANCH,
  /** @internal */ isCI = process.env["CI"]
): string {
  if (isCI) {
    // CIs don't clone the repo, but use a different way to checkout a branch.
    // This means that `origin/HEAD` is never created, which in turn means that
    // we don't have a reliable way to get the default branch. For now, just
    // return a hard-coded value.
    return fallback;
  }

  const defaultBranch = git("rev-parse", "--abbrev-ref", "origin/HEAD");
  if (!defaultBranch) {
    throw new Error("Failed to determine default branch");
  }

  return defaultBranch;
}

/**
 * Returns the commit that the current branch forked off.
 * @param targetBranch The base branch the current branch forked off
 */
export function getBaseCommit(
  targetBranch: string | undefined,
  fallback = DEFAULT_BRANCH
): string | undefined {
  targetBranch =
    targetBranch && verifyRef(targetBranch)
      ? targetBranch
      : getDefaultBranch(fallback);
  return git("merge-base", targetBranch, "HEAD") || undefined;
}
