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
 * - **isGitRepo**: Check if a directory is a git repository
 * - **clone**: Clone a repository with progress streaming
 * - **listFilesWithExclusions**: List tracked files with .syncignore support
 * - **getAllowedRelativePaths**: Get relative paths with prefix stripping
 * - **getGitTreeHashes**: Get file hashes from `git ls-tree`
 * - **getChangeStats**: Parse `git status` into change statistics
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
import { exists } from "./fs.ts";
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

/** Normalize path separators to forward slashes (for Git compatibility on Windows). */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

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
    opts?: { format?: string; pathspec?: string }
  ): Promise<string> {
    const args = ["ls-tree", "-r"];
    if (opts?.format) args.push(`--format=${opts.format}`);
    args.push(ref);
    if (opts?.pathspec) args.push("--", opts.pathspec);
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
  opts?: { filter?: string; cwd?: string }
): AsyncIterable<OutputChunk> {
  const args = ["clone"];
  if (opts?.filter) args.push(`--filter=${opts.filter}`);
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
 * List files in a git directory, excluding patterns from an exclude file.
 *
 * @param repo - Git repository to list files from
 * @param excludeFile - Optional path to a file containing exclusion patterns
 * @returns Array of relative file paths
 */
export async function listFilesWithExclusions(
  repo: GitRepo,
  excludeFile?: string
): Promise<string[]> {
  const allFiles = await repo.lsFiles();

  if (!excludeFile || !(await exists(excludeFile))) {
    return allFiles;
  }

  // -i: show ignored, -c -o: check both tracked and untracked, --exclude-from: use patterns
  const ignoredSet = new Set(
    await repo.lsFiles(["-i", "-c", "-o", `--exclude-from=${excludeFile}`])
  );

  return allFiles.filter((f) => !ignoredSet.has(f));
}

/**
 * Get allowed relative paths from a git directory, with optional prefix stripping.
 */
export async function getAllowedRelativePaths(
  repo: GitRepo,
  excludeFile?: string,
  prefixToStrip?: string
): Promise<string[]> {
  const files = await listFilesWithExclusions(repo, excludeFile);
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
  pathspec?: string
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
