// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Snapshot sync support: build synthetic base/target commits from exactly two
 * upstream snapshots, without upstream history.
 *
 * In snapshot mode fork-sync fetches only the base and target commits
 * (`--depth=1`, no history), then writes two synthetic commits whose trees
 * contain just the synced scope:
 *
 * - superproject entries within the scope pathspecs (unfollowed gitlinks
 *   dropped),
 * - each followed submodule's files grafted in place of its gitlink, at the
 *   SHA the superproject pins at that commit,
 * - minus "pruned" paths (present at base but deliberately absent from the
 *   fork), removed from both sides so they never come back.
 *
 * The synthetic target's only parent is the synthetic base, so the 3-way merge
 * base is exactly the base snapshot, even when the upstream target is on a
 * different branch (e.g. release tags that are not ancestors of each other).
 *
 * This module provides:
 * - **resolveSubmodules**: Map configured submodule paths to URLs and the
 *   base/target SHAs pinned by the superproject
 * - **fetchSubmodules**: Fetch pinned submodule commits, trying fallback URLs
 * - **buildSnapshotCommits**: Write the synthetic base/target commits and
 *   verify every object they reference is present locally
 * - **submoduleRemoteName**: Remote name used for a submodule in the sync repo
 *
 * @example
 * ```typescript
 * const subs = await resolveSubmodules(repo, upstreamUrl, specs, base, target);
 * await fetchSubmodules(repo, subs, specs);
 * const snap = await buildSnapshotCommits({ repo, scope, submodules: subs,
 *   baseCommit: base, targetCommit: target });
 * await repo.checkout(snap.baseCommit);
 * ```
 *
 * @module snapshot
 */

import { createHash } from "node:crypto";
import {
  GITLINK_MODE,
  resolveSubmoduleUrl,
  type GitRepo,
  type GitSubmodule,
  type TreeEntry,
} from "./git.ts";

// =============================================================================
// Types
// =============================================================================

/** A followed submodule as configured in sync-config.json. */
export interface SubmoduleSpec {
  /** Gitlink path in the superproject (normalized, no trailing slash). */
  path: string;
  /** URLs to try, in order, when the `.gitmodules` URL cannot serve a SHA. */
  fallbackUrls: string[];
}

/** A followed submodule resolved against the base and target commits. */
export interface ResolvedSubmodule {
  name: string;
  path: string;
  /** URL from `.gitmodules` (relative URLs resolved). */
  url: string;
  /** URL from the base commit's `.gitmodules` ("" when unknown). */
  baseUrl: string;
  /** URL that actually served the pinned commits (primary or a fallback). */
  servedUrl: string;
  /** Remote name used in the sync repo. */
  remote: string;
  /** SHA pinned at the base commit, or "" (first sync / newly followed). */
  baseSha: string;
  /** SHA pinned at the target commit. */
  targetSha: string;
}

export interface SnapshotInput {
  repo: GitRepo;
  /** Scope pathspecs in the superproject ([] = whole repo). */
  scope: string[];
  submodules: ResolvedSubmodule[];
  /** Upstream base commit, or "" for a first sync. */
  baseCommit: string;
  targetCommit: string;
  /**
   * Returns true for a base path that the fork deliberately removed
   * (keepLocalDeletions). Such paths are dropped from both trees.
   */
  isPruned?: (path: string) => boolean;
}

export interface SnapshotResult {
  /** Synthetic base commit ("" for a first sync). */
  baseCommit: string;
  /** Synthetic target commit (parent: synthetic base). */
  targetCommit: string;
  /** Unfollowed gitlinks inside the scope, at base and target. */
  gitlinks: { base: string[]; target: string[] };
  /** Paths dropped as pruned, and how many of them upstream changed. */
  pruned: { count: number; changedUpstream: number };
}

// =============================================================================
// Submodule resolution and fetching
// =============================================================================

/** Remote name used for a followed submodule in the sync repo. */
export function submoduleRemoteName(subPath: string): string {
  // The hash keeps names unique when sanitizing maps two paths to one name.
  const hash = createHash("sha1").update(subPath).digest("hex").slice(0, 8);
  return `sub-${subPath.replace(/[^A-Za-z0-9._-]+/g, "-")}-${hash}`;
}

async function gitlinkAt(
  repo: GitRepo,
  commit: string,
  subPath: string
): Promise<string> {
  const entries = await repo.lsTreeEntries(commit, [subPath]);
  const entry = entries.find((e) => e.path === subPath);
  return entry && entry.mode === GITLINK_MODE ? entry.oid : "";
}

/**
 * Resolve configured submodule paths to `.gitmodules` URLs and the SHAs the
 * superproject pins at the base and target commits. Throws with a clear
 * message when a configured path is not a gitlink at the target.
 */
export async function resolveSubmodules(
  repo: GitRepo,
  superprojectUrl: string,
  specs: SubmoduleSpec[],
  baseCommit: string,
  targetCommit: string
): Promise<ResolvedSubmodule[]> {
  if (specs.length === 0) return [];

  const targetModules = await repo.readGitmodules(targetCommit);
  const baseModules = baseCommit ? await repo.readGitmodules(baseCommit) : [];
  const findModule = (subPath: string): GitSubmodule | undefined =>
    targetModules.find((m) => m.path === subPath) ??
    baseModules.find((m) => m.path === subPath);

  const result: ResolvedSubmodule[] = [];
  for (const spec of specs) {
    const targetSha = await gitlinkAt(repo, targetCommit, spec.path);
    if (!targetSha) {
      throw new Error(
        `Submodule '${spec.path}' is not a gitlink at target ${targetCommit.slice(0, 8)}. ` +
          `It may have been removed or converted to a regular directory upstream. ` +
          `Update 'submodules' in sync-config.json.`
      );
    }
    const module = findModule(spec.path);
    if (!module) {
      throw new Error(
        `Submodule '${spec.path}' has no entry in .gitmodules at target ${targetCommit.slice(0, 8)}.`
      );
    }
    const url = resolveSubmoduleUrl(module.url, superprojectUrl);
    const baseModule = baseModules.find((m) => m.path === spec.path);
    result.push({
      name: module.name,
      path: spec.path,
      url,
      baseUrl: baseModule
        ? resolveSubmoduleUrl(baseModule.url, superprojectUrl)
        : "",
      servedUrl: url,
      remote: submoduleRemoteName(spec.path),
      baseSha: baseCommit ? await gitlinkAt(repo, baseCommit, spec.path) : "",
      targetSha,
    });
  }
  return result;
}

/**
 * Fetch each submodule's pinned base/target commits (depth 1).
 * Tries the `.gitmodules` URL, then the configured fallback URLs, and records
 * the URL that served them in `servedUrl`. Commits already present are not
 * refetched.
 *
 * Like `git submodule`, URLs taken from upstream's `.gitmodules` may not use
 * the local `file` transport (unless `allowLocalUrls`, e.g. when the
 * superproject itself is local), so an upstream cannot make fork-sync vendor
 * files from the developer's disk. `fallbackUrls` come from the local config
 * and are trusted.
 */
export async function fetchSubmodules(
  repo: GitRepo,
  submodules: ResolvedSubmodule[],
  specs: SubmoduleSpec[],
  opts?: {
    onProgress?: (message: string) => void;
    allowLocalUrls?: boolean;
  }
): Promise<void> {
  for (const sub of submodules) {
    const shas = [...new Set([sub.baseSha, sub.targetSha].filter(Boolean))];
    const missing: string[] = [];
    for (const sha of shas) {
      if (!(await repo.hasCommit(sha))) missing.push(sha);
    }

    if (missing.length === 0) {
      sub.servedUrl =
        (await repo.configGet(`remote.${sub.remote}.url`)) ?? sub.url;
      continue;
    }

    const spec = specs.find((s) => s.path === sub.path);
    const candidates = [
      { url: sub.url, trusted: opts?.allowLocalUrls ?? false },
      ...(spec?.fallbackUrls ?? []).map((url) => ({ url, trusted: true })),
    ];
    const failures: string[] = [];
    let served = "";
    for (const { url, trusted } of candidates) {
      opts?.onProgress?.(`Fetching ${sub.path} from ${url}...`);
      await repo.configSet(`remote.${sub.remote}.url`, url);
      try {
        await repo.fetchRefs(sub.remote, missing, {
          depth: 1,
          noTags: true,
          env: trusted ? undefined : { GIT_PROTOCOL_FROM_USER: "0" },
        });
        let complete = true;
        for (const sha of missing) {
          if (!(await repo.hasCommit(sha))) complete = false;
        }
        if (complete) {
          served = url;
          break;
        }
        failures.push(`${url}: fetched, but pinned commit(s) still missing`);
      } catch (e) {
        const message = (e as { message?: string }).message ?? String(e);
        failures.push(`${url}: ${message.split("\n").slice(-1)[0]}`);
      }
    }

    if (!served) {
      throw new Error(
        `Could not fetch submodule '${sub.path}' commit(s) ${missing
          .map((s) => s.slice(0, 12))
          .join(", ")}.\n` +
          failures.map((f) => `  - ${f}`).join("\n") +
          `\nAdd a mirror that has these commits to 'fallbackUrls' for this submodule.`
      );
    }
    sub.servedUrl = served;
  }
}

// =============================================================================
// Synthetic commits
// =============================================================================

function isUnder(filePath: string, dir: string): boolean {
  return filePath === dir || filePath.startsWith(dir + "/");
}

async function collectEntries(
  repo: GitRepo,
  commit: string,
  scope: string[],
  submodules: ResolvedSubmodule[],
  which: "base" | "target"
): Promise<{ entries: TreeEntry[]; gitlinks: string[] }> {
  const entries: TreeEntry[] = [];
  const gitlinks: string[] = [];

  for (const entry of await repo.lsTreeEntries(commit, scope)) {
    if (submodules.some((s) => isUnder(entry.path, s.path))) continue;
    if (entry.mode === GITLINK_MODE) {
      gitlinks.push(entry.path);
      continue;
    }
    entries.push(entry);
  }

  for (const sub of submodules) {
    const sha = which === "base" ? sub.baseSha : sub.targetSha;
    if (!sha) continue;
    for (const entry of await repo.lsTreeEntries(sha)) {
      const fullPath = `${sub.path}/${entry.path}`;
      if (entry.mode === GITLINK_MODE) {
        gitlinks.push(fullPath);
        continue;
      }
      entries.push({ ...entry, path: fullPath });
    }
  }

  return { entries, gitlinks: gitlinks.sort() };
}

/**
 * Write the synthetic base and target commits for a snapshot sync and verify
 * that every object they reference is present locally.
 */
export async function buildSnapshotCommits(
  input: SnapshotInput
): Promise<SnapshotResult> {
  const { repo, scope, submodules, baseCommit, targetCommit } = input;

  const target = await collectEntries(
    repo,
    targetCommit,
    scope,
    submodules,
    "target"
  );
  const base = baseCommit
    ? await collectEntries(repo, baseCommit, scope, submodules, "base")
    : { entries: [] as TreeEntry[], gitlinks: [] as string[] };

  // Pruned paths: present at base, deliberately absent from the fork. Drop
  // them from both sides so the merge neither restores nor conflicts on them.
  const pruned = new Set<string>();
  if (input.isPruned) {
    for (const entry of base.entries) {
      if (input.isPruned(entry.path)) pruned.add(entry.path);
    }
  }
  const targetOids = new Map(target.entries.map((e) => [e.path, e.oid]));
  let changedUpstream = 0;
  for (const entry of base.entries) {
    if (pruned.has(entry.path) && targetOids.get(entry.path) !== entry.oid) {
      changedUpstream++;
    }
  }
  const baseEntries = base.entries.filter((e) => !pruned.has(e.path));
  const targetEntries = target.entries.filter((e) => !pruned.has(e.path));

  const subSummary = (which: "base" | "target") =>
    submodules
      .map((s) => {
        const sha = which === "base" ? s.baseSha : s.targetSha;
        return sha ? `\n${s.path} ${sha}` : "";
      })
      .join("");

  let syntheticBase = "";
  if (baseCommit) {
    const tree = await repo.buildTree(baseEntries);
    syntheticBase = await repo.commitTree(
      tree,
      [],
      `fork-sync snapshot base ${baseCommit}\n${subSummary("base")}`
    );
  }
  const targetTree = await repo.buildTree(targetEntries);
  const syntheticTarget = await repo.commitTree(
    targetTree,
    syntheticBase ? [syntheticBase] : [],
    `fork-sync snapshot target ${targetCommit}\n${subSummary("target")}`
  );

  await assertComplete(repo, syntheticTarget);

  return {
    baseCommit: syntheticBase,
    targetCommit: syntheticTarget,
    gitlinks: { base: base.gitlinks, target: target.gitlinks },
    pruned: { count: pruned.size, changedUpstream },
  };
}

/**
 * Make sure every object the synthetic commits reference is present locally,
 * so checkout and merge never need a network round trip.
 */
async function assertComplete(repo: GitRepo, commit: string): Promise<void> {
  const missing = await repo.listMissingObjects([commit]);
  if (missing.length > 0) {
    throw new Error(
      `${missing.length} object(s) referenced by the snapshot are missing locally ` +
        `(e.g. ${missing.slice(0, 3).join(", ")}). Delete .sync/<dep>/ and retry.`
    );
  }
}
