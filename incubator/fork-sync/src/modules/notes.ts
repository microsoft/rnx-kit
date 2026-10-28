// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * PR-notes formatting helpers for fork-sync.
 *
 * Pure functions that turn sync results into markdown lines, so they can be
 * unit-tested without running a sync.
 *
 * This module provides:
 * - **formatCommitTable**: Upstream commit table, capped at a maximum row count
 * - **compareUrl**: Web URL comparing two upstream commits (GitHub, Gitiles)
 * - **formatSubmoduleSection**: Followed-submodule pin moves and gitlink drift
 * - **MAX_COMMIT_ROWS**: Default cap for the commit table
 *
 * @example
 * ```typescript
 * const lines = [
 *   ...formatCommitTable(commits),
 *   ...formatSubmoduleSection(reports, gitlinks),
 * ];
 * ```
 *
 * @module notes
 */

import type { ChangeStats } from "./git.ts";

/** Default maximum number of rows in the upstream commit table. */
export const MAX_COMMIT_ROWS = 200;

/** Maximum number of unfollowed gitlinks listed individually. */
export const MAX_GITLINK_ROWS = 50;

/** An upstream commit between base and target. */
export interface UpstreamCommit {
  hash: string;
  author: string;
  subject: string;
}

/** Per-submodule result for the PR notes. */
export interface SubmoduleReport {
  path: string;
  /** URL from `.gitmodules`. */
  url: string;
  /** URL from the base commit's `.gitmodules` ("" when unknown). */
  baseUrl?: string;
  /** URL that served the pinned commits (differs when a fallback was used). */
  servedUrl: string;
  /** Pinned SHA at the base ("" when newly followed). */
  baseSha: string;
  targetSha: string;
  /** Local file changes under the submodule path. */
  changes: ChangeStats;
}

/**
 * Make text safe inside a markdown table cell. Values can come from upstream
 * (commit subjects, `.gitmodules` URLs), so a stray `|` or line break must not
 * end the cell or row. Backslashes are escaped first so `\|` in the input
 * cannot cancel the pipe's escape.
 */
export function escapeCell(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n|\r/g, " ");
}

/**
 * Markdown table of upstream commits, capped at `maxRows` rows followed by an
 * "… and N more" line. Returns a "No commits found in range." line when empty.
 */
export function formatCommitTable(
  commits: UpstreamCommit[],
  maxRows = MAX_COMMIT_ROWS
): string[] {
  if (commits.length === 0) return ["No commits found in range."];
  const lines = [
    "| Commit | Author | Description |",
    "|--------|--------|-------------|",
  ];
  for (const c of commits.slice(0, maxRows)) {
    lines.push(
      `| \`${c.hash.slice(0, 8)}\` | ${escapeCell(c.author)} | ${escapeCell(c.subject)} |`
    );
  }
  if (commits.length > maxRows) {
    lines.push("");
    lines.push(`… and ${commits.length - maxRows} more.`);
  }
  return lines;
}

/**
 * Web URL showing the changes from `base` to `target`, or "" when the host is
 * not recognized. Supports GitHub (`/compare/a...b`) and Gitiles hosts such as
 * `*.googlesource.com` (`/+log/a..b`).
 */
export function compareUrl(
  repoUrl: string,
  base: string,
  target: string
): string {
  const url = repoUrl.replace(/\.git$/, "").replace(/\/+$/, "");
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    return "";
  }
  if (!base) return "";
  if (host === "github.com") return `${url}/compare/${base}...${target}`;
  if (host.endsWith(".googlesource.com"))
    return `${url}/+log/${base}..${target}`;
  return "";
}

function shortSha(sha: string): string {
  return sha ? `\`${sha.slice(0, 12)}\`` : "—";
}

/**
 * Markdown section listing followed submodules (pin moves, the URL that
 * served them, local change counts) and gitlinks that appeared, disappeared,
 * or are present but not followed inside the synced scope.
 */
export function formatSubmoduleSection(
  reports: SubmoduleReport[],
  gitlinks: { base: string[]; target: string[] },
  hasBase = true
): string[] {
  const lines: string[] = [];

  if (reports.length > 0) {
    lines.push(`### Submodules (${reports.length})`);
    lines.push("");
    lines.push("| Path | Pin | Source | Files |");
    lines.push("|------|-----|--------|-------|");
    for (const r of reports) {
      const pin =
        r.baseSha === r.targetSha
          ? `${shortSha(r.targetSha)} (unchanged)`
          : `${shortSha(r.baseSha)} → ${shortSha(r.targetSha)}`;
      const link = compareUrl(r.servedUrl, r.baseSha, r.targetSha);
      const pinCell =
        link && r.baseSha !== r.targetSha
          ? `[${pin}](${escapeCell(link)})`
          : pin;
      const fallback =
        r.servedUrl === r.url
          ? escapeCell(r.url)
          : `${escapeCell(r.servedUrl)} (**fallback**; .gitmodules: ${escapeCell(r.url)})`;
      const source =
        r.baseUrl && r.baseUrl !== r.url
          ? `${fallback} (**URL changed** from ${escapeCell(r.baseUrl)})`
          : fallback;
      const { modified, added, deleted } = r.changes;
      lines.push(
        `| \`${escapeCell(r.path)}\` | ${pinCell} | ${source} | ${modified} modified, ${added} added, ${deleted} deleted |`
      );
    }
    lines.push("");
  }

  const baseSet = new Set(gitlinks.base);
  const targetSet = new Set(gitlinks.target);
  const appeared = gitlinks.target.filter((p) => !baseSet.has(p));
  const removed = gitlinks.base.filter((p) => !targetSet.has(p));
  if (gitlinks.target.length > 0 || removed.length > 0) {
    lines.push("### Gitlinks not followed");
    lines.push("");
    const list = (paths: string[]) =>
      paths
        .slice(0, MAX_GITLINK_ROWS)
        .map((p) => `\`${p}\``)
        .join(", ") +
      (paths.length > MAX_GITLINK_ROWS
        ? `, … and ${paths.length - MAX_GITLINK_ROWS} more`
        : "");
    if (hasBase && appeared.length > 0) {
      lines.push(`New upstream: ${list(appeared)}`);
      lines.push("");
    }
    if (removed.length > 0) {
      lines.push(`Removed upstream: ${list(removed)}`);
      lines.push("");
    }
    for (const p of gitlinks.target.slice(0, MAX_GITLINK_ROWS)) {
      lines.push(`- \`${p}\``);
    }
    if (gitlinks.target.length > MAX_GITLINK_ROWS) {
      lines.push(`- … and ${gitlinks.target.length - MAX_GITLINK_ROWS} more`);
    }
    lines.push("");
  }

  return lines;
}
