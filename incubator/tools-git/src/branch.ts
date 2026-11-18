import { git } from "./git.ts";
import { verifyRef } from "./ref.ts";

export type BranchOptions = {
  /** Directory of the repository; defaults to the current working directory */
  cwd?: string;
  /** Remote to look up the default branch on; defaults to `origin` */
  remote?: string;
};

export type BaseCommitOptions = BranchOptions & {
  /** Commit to find the fork point of; defaults to `HEAD` */
  head?: string;
};

function inRepo(cwd: string | undefined): string[] {
  return cwd ? ["-C", cwd] : [];
}

/**
 * Returns the default branch for the current repository, e.g. `origin/main`.
 * That is the branch `<remote>/HEAD` points to, or else the one the remote
 * reports.
 * @param fallback Branch to use on CI when `<remote>/HEAD` does not exist;
 *                 defaults to `<remote>/main`
 * @param options Repository and remote to look up
 */
export function getDefaultBranch(
  fallback?: string,
  options: BranchOptions = {},
  /** @internal */ isCI = process.env["CI"]
): string {
  const { cwd, remote = "origin" } = options;
  const repo = inRepo(cwd);
  const ref = git(
    ...repo,
    "symbolic-ref",
    "--quiet",
    "--short",
    `refs/remotes/${remote}/HEAD`
  );
  if (ref) {
    return ref;
  }

  if (isCI) {
    // CIs don't clone the repo, but use a different way to checkout a branch.
    // This means that `origin/HEAD` is never created, which in turn means that
    // we don't have a reliable way to get the default branch. For now, just
    // return a hard-coded value.
    return fallback ?? `${remote}/main`;
  }

  const output = git(...repo, "ls-remote", "--symref", "--", remote, "HEAD");
  const match = output.match(/^ref: refs\/heads\/(\S+)\tHEAD$/m);
  if (!match) {
    throw new Error("Failed to determine default branch");
  }

  return `${remote}/${match[1]}`;
}

/**
 * Returns the commit that the current branch forked off.
 * @param targetBranch The base branch the current branch forked off; defaults
 *                     to the default branch
 * @param fallback Branch to use on CI when the default branch is unknown
 * @param options Repository, remote, and commit to look up
 */
export function getBaseCommit(
  targetBranch: string | undefined,
  fallback?: string,
  options: BaseCommitOptions = {}
): string | undefined {
  const { cwd, head = "HEAD" } = options;
  targetBranch =
    targetBranch && verifyRef(targetBranch)
      ? targetBranch
      : getDefaultBranch(fallback, options);
  return git(...inRepo(cwd), "merge-base", targetBranch, head) || undefined;
}
