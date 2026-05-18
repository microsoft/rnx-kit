import { spawnSync } from "node:child_process";
import changesetsConfig from "../.changeset/config.json" with { type: "json" };

function git(...args: string[]): string {
  const { stderr, stdout } = spawnSync("git", args);
  const message = stderr.toString().trim();
  if (message) {
    console.error(message);
  }
  return stdout.toString().trim();
}

function getDefaultBranch(): string {
  if (process.env["CI"]) {
    // CIs don't clone the repo, but use a different way to checkout a branch.
    // This means that `origin/HEAD` is never created, which in turn means that
    // we don't have a reliable way to get the default branch. For now, just
    // return a hard-coded value.
    return changesetsConfig.baseBranch ?? "origin/main";
  }

  const defaultBranch = git("rev-parse", "--abbrev-ref", "origin/HEAD");
  if (!defaultBranch) {
    throw new Error("Failed to determine default branch");
  }

  return defaultBranch;
}

function getBaseCommit(targetBranch: string | undefined): string {
  targetBranch =
    !targetBranch || targetBranch.endsWith("/")
      ? getDefaultBranch()
      : targetBranch;
  const base = git("merge-base", "--fork-point", targetBranch);
  if (!base) {
    console.error("❌ Failed to determine base commit");
  }
  return base;
}

function getChangedFiles(since: string): string[] {
  const changedFiles = git("diff", "--name-only", since);
  if (!changedFiles) {
    return [];
  }
  return changedFiles.split("\n");
}

function parseVersion(version: string): number {
  const [major, minor = 0, patch = 0] = version.split(".");
  return Number(major) * 1000000 + Number(minor) * 1000 + Number(patch);
}

function main(targetBranch: string | undefined): number {
  const baseCommit = getBaseCommit(targetBranch);
  if (!baseCommit) {
    return 1;
  }

  let errors = 0;
  for (const file of getChangedFiles(baseCommit)) {
    if (!file.endsWith("package.json")) {
      continue;
    }

    const diff = git("diff", baseCommit, file);
    const matches = Array.from(diff.matchAll(/"node": "[^\d]*([.\d]+)"/g));
    if (matches.length < 2) {
      continue;
    }

    const prev = matches[0][1];
    const next = matches[1][1];
    if (parseVersion(next) < parseVersion(prev)) {
      errors++;
      console.error(
        `❌ ${file}: minimum Node version downgraded from ${prev} to ${next}`
      );
    }
  }

  return errors;
}

const { [2]: targetBranch } = process.argv;
process.exitCode = main(targetBranch);
