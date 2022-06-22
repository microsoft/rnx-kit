import { makeCommand, makeCommandSync } from "./command";
import { BUILD_ID } from "./constants";

const git = makeCommand("git");
const gitSync = makeCommandSync("git");

function commitStagedChanges(): () => void {
  if (gitSync("diff", "--staged", "--exit-code").status === 0) {
    return () => undefined;
  }

  gitSync("commit", "--message", `"[${BUILD_ID}] changes to be committed"`);
  return () => gitSync("reset", "--soft", "@^");
}

function commitUnstagedChanges(): () => void {
  if (gitSync("diff", "--exit-code").status === 0) {
    return () => undefined;
  }

  gitSync("add", "--all");
  gitSync(
    "commit",
    "--message",
    `"[${BUILD_ID}] changes not staged for commit"`
  );
  return () => gitSync("reset", "--mixed", "@^");
}

function ensureDoubleDigit(n: number): string {
  return n < 10 ? "0" + n : n.toString();
}

function generateBranchName(): string {
  const currentBranch = gitSync("branch", "--show-current").stdout.trim();
  const sha = gitSync("rev-list", "-1", "HEAD").stdout.substring(0, 8);

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = ensureDoubleDigit(now.getUTCMonth());
  const date = ensureDoubleDigit(now.getUTCDate());
  const hours = ensureDoubleDigit(now.getUTCHours());
  const minutes = ensureDoubleDigit(now.getUTCMinutes());
  const seconds = ensureDoubleDigit(now.getUTCSeconds());
  const milliseconds = now.getUTCMilliseconds();

  return `${BUILD_ID}/${currentBranch}/${year}${month}${date}-${hours}${minutes}${seconds}.${milliseconds}-${sha}`;
}

/**
 * Deletes the specified branch/tag.
 * @param ref The branch/tag to delete
 * @param upstream Deletes the upstream (tracking) reference if specified
 */
export async function deleteBranch(
  ref: string,
  upstream?: string
): Promise<void> {
  gitSync("branch", "--delete", "--force", ref);
  if (upstream) {
    await git("push", upstream, ":" + ref);
  }
}

/**
 * Returns the remote URL.
 * @param upstream Upstream (tracking) reference
 * @returns Remote URL
 */
export function getRemoteUrl(upstream = "origin"): string {
  return gitSync("remote", "get-url", upstream).stdout.trim();
}

/**
 * Returns the path to the root of the repository.
 * @returns Path to the root of the repository
 */
export function getRepositoryRoot(): string {
  return gitSync("rev-parse", "--show-toplevel").stdout.trim();
}

/**
 * Push current changes to remote.
 * @param upstream Upstream (tracking) reference
 * @returns The name of the branch if successfully pushed to remote
 */
export async function pushCurrentChanges(
  upstream: string
): Promise<string | false> {
  const buildBranch = generateBranchName();

  // The order of the following operations is important. We want to push
  // everything that the user currently has, even untracked files, then restore
  // everything to its original state, including staged files. And it's
  // important that we immediately do so as soon as the build branch is created.
  // This is to avoid leaving things in a weird state should anything go wrong
  // while pushing to upstream.
  const restoreStagedChanges = commitStagedChanges();
  const restoreUnstagedChanges = commitUnstagedChanges();
  gitSync("branch", buildBranch);
  restoreUnstagedChanges();
  restoreStagedChanges();

  const { status } = await git("push", "--set-upstream", upstream, buildBranch);
  if (status !== 0) {
    deleteBranch(buildBranch);
    return false;
  }

  return buildBranch;
}

export function stage(...files: string[]): void {
  gitSync("add", ...files);
}
