// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * GitHub operations via the gh CLI.
 *
 * Provides functions for creating and managing pull requests using the GitHub
 * CLI (`gh`). Uses `--body-file` with temp files to handle multiline markdown
 * safely on Windows (cmd.exe cannot handle multiline strings in arguments).
 *
 * This module provides:
 * - **findPR**: Find an existing open PR by head branch name
 * - **createPR**: Create a new pull request
 * - **updatePR**: Update an existing pull request's title and body
 *
 * All functions use `exec()` from proc.ts (shell mode) because `gh` is
 * installed as a .cmd file on Windows and requires shell execution.
 *
 * @example
 * ```typescript
 * const existing = await findPR({ head: "fork-sync/nodejs", cwd: "/repo" });
 * if (existing) {
 *   await updatePR({ number: existing.number, title: "...", body: "...", cwd: "/repo" });
 * } else {
 *   const pr = await createPR({ head: "fork-sync/nodejs", base: "main", title: "...", body: "...", cwd: "/repo" });
 *   console.log(pr.url);
 * }
 * ```
 *
 * @module github
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { exec, shellVar } from "./proc.ts";

// =============================================================================
// Types
// =============================================================================

export interface PRInfo {
  number: number;
  url: string;
}

// =============================================================================
// Temp File Utilities
// =============================================================================

/**
 * Run a callback with a temporary file containing the given content.
 * The file is cleaned up after the callback completes (success or failure).
 */
async function withTempFile<T>(
  content: string,
  fn: (filePath: string) => Promise<T>
): Promise<T> {
  const tmpFile = path.join(
    os.tmpdir(),
    `gh-pr-body-${process.pid}-${Date.now()}.md`
  );
  fs.writeFileSync(tmpFile, content, "utf8");
  try {
    return await fn(tmpFile);
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

// =============================================================================
// PR Operations
// =============================================================================

/**
 * Find an existing open PR by head branch name.
 * Returns null if no matching PR exists.
 */
export async function findPR(opts: {
  head: string;
  cwd: string;
  repo?: string;
}): Promise<PRInfo | null> {
  const repoFlag = opts.repo ? ` --repo ${shellVar("REPO")}` : "";
  const env: Record<string, string> = {
    PR_HEAD: opts.head,
    ...(opts.repo ? { REPO: opts.repo } : {}),
  };
  const result = await exec(
    `gh pr list --head ${shellVar("PR_HEAD")} --json number,url --limit 1${repoFlag}`,
    { cwd: opts.cwd, fallback: "[]", env }
  );

  let prs: { number: number; url: string }[];
  try {
    prs = JSON.parse(result);
  } catch {
    return null;
  }

  if (!Array.isArray(prs) || prs.length === 0) {
    return null;
  }

  return { number: prs[0].number, url: prs[0].url };
}

/**
 * Create a new pull request. Returns the PR number and URL.
 *
 * Uses --body-file with a temp file to avoid shell escaping issues
 * with multiline markdown content on Windows cmd.exe.
 */
export async function createPR(opts: {
  head: string;
  base: string;
  title: string;
  body: string;
  cwd: string;
  repo?: string;
}): Promise<PRInfo> {
  return withTempFile(opts.body, async (bodyFile) => {
    const repoFlag = opts.repo ? ` --repo ${shellVar("REPO")}` : "";
    const env: Record<string, string> = {
      PR_HEAD: opts.head,
      PR_BASE: opts.base,
      PR_TITLE: opts.title,
      BODY_FILE: bodyFile,
      ...(opts.repo ? { REPO: opts.repo } : {}),
    };
    const result = await exec(
      `gh pr create --head ${shellVar("PR_HEAD")} --base ${shellVar("PR_BASE")}` +
        ` --title ${shellVar("PR_TITLE")}` +
        ` --body-file ${shellVar("BODY_FILE")}${repoFlag}`,
      { cwd: opts.cwd, env }
    );

    // gh pr create outputs the PR URL on success
    const url = result.trim();
    const match = url.match(/\/pull\/(\d+)/);
    const number = match ? parseInt(match[1], 10) : 0;

    return { number, url };
  });
}

/**
 * Update an existing pull request's title and body.
 *
 * Uses --body-file with a temp file to avoid shell escaping issues
 * with multiline markdown content on Windows cmd.exe.
 */
export async function updatePR(opts: {
  number: number;
  title: string;
  body: string;
  cwd: string;
  repo?: string;
}): Promise<void> {
  await withTempFile(opts.body, async (bodyFile) => {
    const repoFlag = opts.repo ? ` --repo ${shellVar("REPO")}` : "";
    const env: Record<string, string> = {
      PR_TITLE: opts.title,
      BODY_FILE: bodyFile,
      ...(opts.repo ? { REPO: opts.repo } : {}),
    };
    await exec(
      `gh pr edit ${opts.number} --title ${shellVar("PR_TITLE")}` +
        ` --body-file ${shellVar("BODY_FILE")}${repoFlag}`,
      { cwd: opts.cwd, env }
    );
  });
}
