// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Git operations module.
 *
 * Provides a typed interface for Git commands via the {@link GitRepo} class and
 * standalone helper functions. All commands are executed through the proc module.
 *
 * This module provides:
 * - **GitRepo**: Class wrapping a directory path, providing typed git operations
 *   (includes **tagsPointingAt** for listing tags at a commit)
 * - **isGitRepo**: Check if a directory is a git repository
 * - **clone**: Clone a repository with progress streaming
 * - **listFilesWithExclusions**: List tracked files with .syncignore support
 * - **getAllowedRelativePaths**: Get relative paths with prefix stripping
 * - **getGitTreeHashes**: Get file hashes from `git ls-tree`
 * - **getChangeStats**: Parse `git status` into change statistics
 * - **pickTag**: Choose a tag from candidates, biased toward continuity with
 *   an existing tag (longest common prefix)
 *
 * @example
 * ```typescript
 * const repo = new GitRepo('/path/to/repo');
 * await repo.fetch();
 * await repo.checkout('main');
 * const status = await repo.statusPorcelain();
 * ```
 *
 * @module git
 */

import * as path from "node:path";
import { exists, normalizePath } from "./fs.ts";
import { spawn, type OutputChunk } from "./proc.ts";

// =============================================================================
// Types
// =============================================================================

export interface MergeResult {
  resolved: string[];
  conflicts: string[];
}

export interface ChangeStats {
  modified: number;
  added: number;
  deleted: number;
}

export interface MergeTool {
  name: string;
  cmd: string | null;
  path: string | null;
  trustExitCode: string | null;
}

// =============================================================================
// Path Utilities
// =============================================================================

function stripPrefix(filePath: string, prefix?: string): string | null {
  if (!prefix) {
    return filePath;
  }

  const normalizedPath = normalizePath(filePath);
  let normalizedPrefix = normalizePath(prefix);

  if (!normalizedPrefix.endsWith("/")) {
    normalizedPrefix += "/";
  }

  return normalizedPath.startsWith(normalizedPrefix)
    ? normalizedPath.slice(normalizedPrefix.length)
    : null;
}

// =============================================================================
// GitRepo Class
// =============================================================================

/**
 * Typed wrapper around a git repository directory.
 * All methods execute git commands with `cwd` set to the wrapped directory.
 */
export class GitRepo {
  readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  // ---------------------------------------------------------------------------
  // Status & queries
  // ---------------------------------------------------------------------------

  /** Run `git status --porcelain` and return raw output. Empty string = clean. */
  async statusPorcelain(pathspec?: string): Promise<string> {
    const args = ["status", "--porcelain"];
    if (pathspec) args.push(pathspec);
    return spawn("git", args, { cwd: this.dir, fallback: "" });
  }

  /** Resolve a ref to its commit hash. Returns empty string on failure. */
  async revParse(ref: string): Promise<string> {
    return spawn("git", ["rev-parse", ref], { cwd: this.dir, fallback: "" });
  }

  /** Resolve a ref via rev-list (handles both lightweight and annotated tags). */
  async revList(ref: string, opts?: { count?: number }): Promise<string> {
    const args = ["rev-list"];
    if (opts?.count) args.push("-n", String(opts.count));
    args.push(ref);
    return spawn("git", args, { cwd: this.dir, fallback: "" });
  }

  /**
   * List tags that point exactly at the given commit.
   * Returns [] if none, or if the git command fails.
   * Handles both lightweight and annotated tags.
   */
  async tagsPointingAt(commit: string): Promise<string[]> {
    const out = await spawn("git", ["tag", "--points-at", commit], {
      cwd: this.dir,
      fallback: "",
    });
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /** Check if `base` is an ancestor of `target`. */
  async mergeBaseIsAncestor(base: string, target: string): Promise<boolean> {
    const result = await spawn(
      "git",
      ["merge-base", "--is-ancestor", base, target],
      {
        cwd: this.dir,
        fallback: "not-ancestor",
      }
    );
    return result !== "not-ancestor";
  }

  /** Show content of a git object (e.g., `:1:path` for merge stage 1). */
  async show(ref: string): Promise<string> {
    return spawn("git", ["show", ref], { cwd: this.dir, fallback: "" });
  }

  /** Get the remote origin URL. */
  async getOriginUrl(): Promise<string | null> {
    return this.configGet("remote.origin.url");
  }

  /** Get commit log between two refs. */
  async log(opts: {
    format: string;
    range: string;
    path?: string;
  }): Promise<string> {
    const args = ["log", `--format=${opts.format}`, opts.range];
    if (opts.path) args.push("--", opts.path);
    return spawn("git", args, { cwd: this.dir, fallback: "" });
  }

  /** Get current branch name. */
  async currentBranch(): Promise<string> {
    return spawn("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: this.dir,
    });
  }

  /** List remotes (`git remote -v`). */
  async remoteList(): Promise<string> {
    return spawn("git", ["remote", "-v"], { cwd: this.dir, fallback: "" });
  }

  /** Check if a ref exists on a remote. */
  async lsRemote(remote: string, ref: string): Promise<string> {
    return spawn("git", ["ls-remote", remote, ref], {
      cwd: this.dir,
      fallback: "",
    });
  }

  // ---------------------------------------------------------------------------
  // Diff & file listing
  // ---------------------------------------------------------------------------

  /** List files matching diff criteria (null-terminated output). */
  async diffNameOnly(opts?: {
    cached?: boolean;
    diffFilter?: string;
  }): Promise<string[]> {
    const args = ["diff", "-z", "--name-only"];
    if (opts?.cached) args.push("--cached");
    if (opts?.diffFilter) args.push(`--diff-filter=${opts.diffFilter}`);
    const output = await spawn("git", args, { cwd: this.dir, fallback: "" });
    return output.split("\0").filter((f) => f.length > 0);
  }

  /** Get resolved and conflicted files after a merge. */
  async getMergeResult(): Promise<MergeResult> {
    return {
      resolved: await this.diffNameOnly({ cached: true }),
      conflicts: await this.diffNameOnly({ diffFilter: "U" }),
    };
  }

  /** List tracked files (null-terminated output). */
  async lsFiles(extraArgs: string[] = []): Promise<string[]> {
    const output = await spawn("git", ["ls-files", "-z", ...extraArgs], {
      cwd: this.dir,
    });
    return output.split("\0").filter((f) => f.length > 0);
  }

  /** Run `git ls-tree -r` and return raw output. */
  async lsTree(
    ref: string,
    opts?: { format?: string; pathspec?: string | string[] }
  ): Promise<string> {
    const args = ["ls-tree", "-r"];
    if (opts?.format) args.push(`--format=${opts.format}`);
    args.push(ref);
    const pathspecs = toPathspecList(opts?.pathspec);
    if (pathspecs.length) args.push("--", ...pathspecs);
    return spawn("git", args, { cwd: this.dir });
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  /** Fetch from remote (default: origin). */
  async fetch(remote = "origin"): Promise<void> {
    await spawn("git", ["fetch", remote], { cwd: this.dir });
  }

  /** Checkout a ref (commit, branch, or tag). */
  async checkout(ref: string): Promise<void> {
    await spawn("git", ["checkout", ref], { cwd: this.dir });
  }

  /** Create and checkout a new branch. */
  async checkoutNewBranch(name: string): Promise<void> {
    await spawn("git", ["checkout", "-b", name], { cwd: this.dir });
  }

  /** Detach HEAD at a ref. Silently succeeds even if ref is invalid. */
  async checkoutDetach(ref: string): Promise<void> {
    await spawn("git", ["checkout", "--detach", ref], {
      cwd: this.dir,
      fallback: "",
    });
  }

  /** Stage all changes (`git add -A`). */
  async stageAll(): Promise<void> {
    await spawn("git", ["add", "-A"], { cwd: this.dir });
  }

  /** Stage specific files. */
  async stage(...paths: string[]): Promise<void> {
    await spawn("git", ["add", ...paths], { cwd: this.dir });
  }

  /** Create a commit with a message. */
  async commit(message: string): Promise<void> {
    await spawn("git", ["commit", "-m", message], { cwd: this.dir });
  }

  /** Commit with --no-edit (for merge commits). Returns false if commit failed. */
  async commitNoEdit(): Promise<boolean> {
    const result = await spawn("git", ["commit", "--no-edit"], {
      cwd: this.dir,
      fallback: "failed",
    });
    return result !== "failed";
  }

  /**
   * Merge a branch. Returns true if clean, false if conflicts.
   * @param strategy - Merge strategy option (e.g., 'histogram')
   */
  async merge(branch: string, opts?: { strategy?: string }): Promise<boolean> {
    const args = ["merge", branch, "--no-edit"];
    if (opts?.strategy) args.push("-X", opts.strategy);
    const result = await spawn("git", args, {
      cwd: this.dir,
      fallback: "conflicts",
    });
    return result !== "conflicts";
  }

  /** Push a branch to remote. */
  async push(
    remote: string,
    branch: string,
    opts?: { force?: boolean }
  ): Promise<void> {
    const args = ["push"];
    if (opts?.force) args.push("--force");
    args.push(remote, branch);
    await spawn("git", args, { cwd: this.dir });
  }

  /** Create and checkout a branch, resetting it if it already exists. */
  async checkoutNewBranchForce(name: string): Promise<void> {
    await spawn("git", ["checkout", "-B", name], { cwd: this.dir });
  }

  /** Reset to HEAD, discarding all changes. */
  async resetHard(): Promise<void> {
    await spawn("git", ["reset", "--hard"], { cwd: this.dir, fallback: "" });
  }

  /** Remove untracked files and directories. */
  async cleanFd(): Promise<void> {
    await spawn("git", ["clean", "-fd"], { cwd: this.dir, fallback: "" });
  }

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------

  /** Read a git config value. Returns null if not set. */
  async configGet(key: string): Promise<string | null> {
    const result = await spawn("git", ["config", "--get", key], {
      cwd: this.dir,
      fallback: "",
    });
    return result || null;
  }

  /** Set a git config value. */
  async configSet(key: string, value: string): Promise<void> {
    await spawn("git", ["config", key, value], { cwd: this.dir });
  }

  /**
   * Get the configured merge tool from git config.
   * Checks merge.guitool first, then merge.tool.
   * Returns null if no merge tool is configured.
   */
  async getConfiguredMergeTool(): Promise<MergeTool | null> {
    const toolName =
      (await this.configGet("merge.guitool")) ??
      (await this.configGet("merge.tool"));

    if (!toolName) {
      return null;
    }

    return {
      name: toolName,
      cmd: await this.configGet(`mergetool.${toolName}.cmd`),
      path: await this.configGet(`mergetool.${toolName}.path`),
      trustExitCode: await this.configGet(
        `mergetool.${toolName}.trustExitCode`
      ),
    };
  }

  /**
   * Write merge tool settings into git config.
   * Sets mergetool.<name>.cmd, .path, and .trustExitCode if provided.
   */
  async setMergeTool(tool: MergeTool): Promise<void> {
    if (tool.cmd) {
      await this.configSet(`mergetool.${tool.name}.cmd`, tool.cmd);
    }
    if (tool.path) {
      await this.configSet(`mergetool.${tool.name}.path`, tool.path);
    }
    if (tool.trustExitCode) {
      await this.configSet(
        `mergetool.${tool.name}.trustExitCode`,
        tool.trustExitCode
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Interactive commands
  // ---------------------------------------------------------------------------

  /** Run git mergetool with all stdio inherited (preserves TTY). */
  async mergetool(opts?: { noPrompt?: boolean }): Promise<void> {
    const args = ["mergetool"];
    if (opts?.noPrompt) args.push("--no-prompt");
    await spawn("git", args, {
      cwd: this.dir,
      mode: "passthrough",
      ignoreExitCode: true,
    });
  }

  // ---------------------------------------------------------------------------
  // Sparse checkout
  // ---------------------------------------------------------------------------

  /** Initialize sparse checkout in cone mode. */
  async sparseCheckoutInit(): Promise<void> {
    await spawn("git", ["sparse-checkout", "init", "--cone"], {
      cwd: this.dir,
    });
  }

  /** Set sparse checkout patterns. Accepts one or more directory paths. */
  async sparseCheckoutSet(...dirs: string[]): Promise<void> {
    await spawn("git", ["sparse-checkout", "set", ...dirs], {
      cwd: this.dir,
    });
  }

  /** Disable sparse checkout (re-enable full working tree). */
  async sparseCheckoutDisable(): Promise<void> {
    await spawn("git", ["sparse-checkout", "disable"], {
      cwd: this.dir,
      fallback: "",
    });
  }
}

// =============================================================================
// Standalone Functions
// =============================================================================

/** Check if a directory is a git repository (has a .git subdirectory). */
export async function isGitRepo(dir: string): Promise<boolean> {
  return exists(path.join(dir, ".git"));
}

/** Discover the git repository root. Returns null if not in a git repo. */
export async function discoverRepoRoot(cwd?: string): Promise<string | null> {
  const result = await spawn("git", ["rev-parse", "--show-toplevel"], {
    cwd: cwd ?? process.cwd(),
    fallback: "",
  });
  return result ? path.normalize(result.trim()) : null;
}

/** Clone a repository. Returns an async iterable of progress chunks. */
export function clone(
  url: string,
  targetDir: string,
  opts?: { filter?: string; cwd?: string; noCheckout?: boolean }
): AsyncIterable<OutputChunk> {
  const args = ["clone"];
  if (opts?.filter) args.push(`--filter=${opts.filter}`);
  // Skip the initial working-tree checkout. Used with sparse-checkout so the
  // expensive hydration happens once, at the later sparse target checkout,
  // instead of materializing the whole default branch first.
  if (opts?.noCheckout) args.push("--no-checkout");
  args.push(url, targetDir);
  return spawn("git", args, {
    cwd: opts?.cwd ?? process.cwd(),
    mode: "interactive",
  });
}

// =============================================================================
// Remotes Utilities
// =============================================================================

/** Parse an HTTPS git repo URL into its components. */
export function parseRepoUrl(url: string): {
  host: string;
  owner: string;
  name: string;
} {
  const match = url.match(/^https:\/\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error(
      `Invalid repo URL: ${url}. Expected format: https://github.com/owner/repo`
    );
  }
  return { host: match[1], owner: match[2], name: match[3] };
}

/**
 * Check whether a repo's remote origin matches an expected URL.
 * Compares HTTPS variants (with/without .git) and the SSH equivalent.
 */
export async function validateCloneOrigin(
  repo: GitRepo,
  expectedUrl: string
): Promise<{ valid: boolean; currentOrigin?: string }> {
  const originUrl = (await repo.getOriginUrl()) ?? "";

  // Build list of equivalent URLs to compare against
  const expectedHttps = expectedUrl.endsWith(".git")
    ? expectedUrl
    : `${expectedUrl}.git`;
  const expectedHttpsNoGit = expectedUrl.replace(/\.git$/, "");

  // For SSH comparison, parse the URL to get host/owner/name
  const { host, owner, name } = parseRepoUrl(expectedUrl);
  const expectedSsh = `git@${host}:${owner}/${name}.git`;

  const originMatchesExpected = [
    expectedHttps,
    expectedHttpsNoGit,
    expectedSsh,
  ].some((expected) => originUrl.toLowerCase() === expected.toLowerCase());

  return { valid: originMatchesExpected, currentOrigin: originUrl };
}

// =============================================================================
// Higher-Level Git Functions
// =============================================================================

/**
 * Normalize an optional pathspec argument (a single path or a list) into a
 * clean list of non-empty paths, suitable for appending after a `--` separator.
 * Returns `[]` for `undefined`, an empty string, or a list of only empties — so
 * callers fall through to "no pathspec" (whole-repo) behavior, matching the
 * prior single-string semantics.
 */
function toPathspecList(pathspec?: string | string[]): string[] {
  if (!pathspec) return [];
  const list = Array.isArray(pathspec) ? pathspec : [pathspec];
  return list.filter((p) => p.length > 0);
}

/**
 * List files in a git directory, excluding patterns from an exclude file.
 *
 * Uses `--exclude-per-directory=.syncignore` so that patterns in the file are
 * interpreted relative to the directory containing it (like `.gitignore`).
 * The `.syncignore` file must be present in the repo for exclusions to apply.
 *
 * @param repo - Git repository to list files from
 * @param excludeFile - Path to a .syncignore file; used as existence check only
 * @param pathspec - Optional pathspec(s) to scope listing to one or more
 *   subfolders. Accepts a single path or a list (e.g. `sparsePaths`); empty
 *   entries are ignored.
 * @returns Array of relative file paths
 */
export async function listFilesWithExclusions(
  repo: GitRepo,
  excludeFile?: string,
  pathspec?: string | string[]
): Promise<string[]> {
  const pathspecs = toPathspecList(pathspec);
  const pathspecArgs = pathspecs.length ? ["--", ...pathspecs] : [];
  const allFiles = await repo.lsFiles(pathspecArgs);

  if (!excludeFile || !(await exists(excludeFile))) {
    return allFiles;
  }

  // -i: show ignored, -c -o: check both tracked and untracked
  // --exclude-per-directory: patterns anchored to the directory containing the file
  const ignoredSet = new Set(
    await repo.lsFiles([
      "-i",
      "-c",
      "-o",
      "--exclude-per-directory=.syncignore",
      ...pathspecArgs,
    ])
  );

  return allFiles.filter((f) => !ignoredSet.has(f));
}

/**
 * Get allowed relative paths from a git directory, with optional prefix stripping.
 */
export async function getAllowedRelativePaths(
  repo: GitRepo,
  excludeFile?: string,
  prefixToStrip?: string,
  pathspec?: string | string[]
): Promise<string[]> {
  const files = await listFilesWithExclusions(repo, excludeFile, pathspec);
  const result: string[] = [];

  for (const file of files) {
    const normalized = normalizePath(file);
    const relative = stripPrefix(normalized, prefixToStrip);
    if (relative !== null) {
      result.push(relative);
    }
  }

  return result;
}

function parseGitTreeLine(line: string): { hash: string; path: string } | null {
  const match = line.match(/^([0-9a-f]{40})\s+(.*)$/);
  if (!match) {
    return null;
  }

  return { hash: match[1], path: normalizePath(match[2]) };
}

/**
 * Get git tree hashes for file comparison.
 * Parses `git ls-tree` output into a map of relative path → object hash.
 */
export async function getGitTreeHashes(
  repo: GitRepo,
  allowedPaths: Set<string>,
  prefixToStrip?: string,
  pathspec?: string | string[]
): Promise<Map<string, string>> {
  const output = await repo.lsTree("HEAD", {
    format: "%(objectname) %(path)",
    pathspec,
  });

  const hashes = new Map<string, string>();

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const parsed = parseGitTreeLine(line);
    if (!parsed) continue;

    const relative = stripPrefix(parsed.path, prefixToStrip);
    if (relative === null) {
      continue;
    }

    if (allowedPaths.size > 0 && !allowedPaths.has(relative)) {
      continue;
    }

    hashes.set(relative, parsed.hash);
  }

  return hashes;
}

/**
 * Get change statistics from git status for a given pathspec.
 * Parses `git status --porcelain` output into counts by change type.
 */
export async function getChangeStats(
  repo: GitRepo,
  pathspec: string
): Promise<ChangeStats> {
  const status = await repo.statusPorcelain(pathspec);
  if (!status) return { modified: 0, added: 0, deleted: 0 };

  let modified = 0;
  let added = 0;
  let deleted = 0;

  for (const line of status.split("\n")) {
    if (!line.trim()) continue;
    const code = line.substring(0, 2);
    // M = modified, MM = modified in index and working tree
    if (code.includes("M")) {
      modified++;
    } else if (code === "??" || code.includes("A")) {
      // ?? = untracked, A = added to index
      added++;
    } else if (code.includes("D")) {
      deleted++;
    }
  }

  return { modified, added, deleted };
}

// =============================================================================
// Tag Utilities
// =============================================================================

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a.charCodeAt(i) === b.charCodeAt(i)) i++;
  return i;
}

/**
 * Pick the best tag for a synced commit from a list of candidates.
 *
 * Rules:
 * - No candidates → empty string (signals "clear any previously stored tag").
 * - One candidate → use it.
 * - Multiple candidates, no existing tag → first lexicographic.
 * - Multiple candidates, existing tag present → candidate with the longest
 *   common prefix to the existing tag; ties broken lexicographically.
 *
 * The lexicographic tiebreak and the sort are stable, so the result is
 * deterministic for a given input.
 */
export function pickTag(candidates: string[], existing: string): string {
  if (candidates.length === 0) return "";
  if (candidates.length === 1) return candidates[0];

  const sorted = [...candidates].sort();
  if (!existing) return sorted[0];

  let best = sorted[0];
  let bestLcp = commonPrefixLength(best, existing);
  for (let i = 1; i < sorted.length; i++) {
    const cand = sorted[i];
    const lcp = commonPrefixLength(cand, existing);
    if (lcp > bestLcp) {
      best = cand;
      bestLcp = lcp;
    }
  }
  return best;
}
