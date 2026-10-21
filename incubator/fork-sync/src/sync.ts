#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Dependency Sync Tool
 *
 * Synchronizes forked/vendored dependencies with upstream using Git's native
 * 3-way merge. Preserves local modifications while incorporating upstream changes.
 *
 * Usage: node sync.ts --help
 *
 * Vocabulary:
 *   - base commit:   Last synced upstream commit (the 3-way merge base)
 *   - target:        New upstream commit to sync to
 *   - work branch:   Branch in .sync/<dep>/ with base + our local changes applied
 *   - target branch: Branch in .sync/<dep>/ at the target commit
 *   - local path:    Our vendored copy in the main repo (e.g. deps/nodejs/)
 *
 * High-level flow (main function):
 *
 *   1. Parse CLI arguments
 *   2. Handle special modes (early exits):
 *      - --status: Show sync checkpoint status for a dependency
 *      - --abort: Cancel an in-progress sync
 *      - --clean --no-sync: Only clean .sync/<dep>/ directory
 *
 *   3. Load manifest and find dependency configuration
 *
 *   4. NEW SYNC (default) or CONTINUE (--continue):
 *      NEW SYNC:
 *        - Verify no sync already in progress
 *        - Verify clean git state in main repo
 *        - Clone/fetch upstream repo to .sync/<dep>/
 *        - Create target branch (resolve target, validate ancestry)
 *        - Create work branch (base commit + local changes applied)
 *        - Merge target into work branch
 *      CONTINUE:
 *        - Read saved sync checkpoint
 *        - Validate config hasn't changed since pause
 *        - Restore sync parameters from checkpoint
 *
 *   5. Conflict resolution:
 *      - If conflicts exist, run AI-assisted mergetool
 *      - If conflicts remain, pause and exit (user resolves manually)
 *      - On successful resolution, continue
 *
 *   6. Apply changes:
 *      - Copy merged files from work branch to local path
 *      - Delete orphaned files (removed upstream)
 *      - Update sync-config.json with new commit
 *      - Print summary
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { parseModelList } from "./modules/ai-model.ts";
import { REASONING_EFFORT_LEVELS } from "./modules/copilot.ts";
import {
  copyFilesInParallel,
  deleteFile,
  ensureDir,
  exists,
  hashFileContent,
  normalizePath,
  removeDir,
  removeEmptyParentDirs,
} from "./modules/fs.ts";
import {
  GitRepo,
  clone,
  discoverRepoRoot,
  getAllowedRelativePaths,
  getChangeStats,
  getGitTreeHashes,
  isGitRepo,
  pickTag,
  resolveRemoteRef,
  toCloneUrl,
  validateCloneOrigin,
  type ChangeStats,
  type MergeResult,
  type MergeTool,
} from "./modules/git.ts";
import { closePR, createPR, findPR, updatePR } from "./modules/github.ts";
import {
  compareUrl,
  formatCommitTable,
  formatSubmoduleSection,
  type SubmoduleReport,
  type UpstreamCommit,
} from "./modules/notes.ts";
import * as proc from "./modules/proc.ts";
import {
  buildSnapshotCommits,
  fetchSubmodules,
  resolveSubmodules,
  type ResolvedSubmodule,
  type SnapshotResult,
  type SubmoduleSpec,
} from "./modules/snapshot.ts";
const { spawn, exec } = proc;

import type { Job } from "./modules/job-ui.ts";
import * as jobs from "./modules/job-ui.ts";
import {
  VALID_LOG_LEVELS,
  debug,
  getLogFilePath,
  getLogLevel,
  getTimestampForFile,
  initLogger,
  logMessage,
  validateLogLevel,
  type LogLevel,
} from "./modules/log.ts";
import * as ui from "./modules/tty-ui.ts";
const { confirm, print, info, warn, error, fatal, exit, style, ttyOrLog } = ui;

// =============================================================================
// Configuration
// =============================================================================

/** Script directory for our script and for finding ai-merge.ts */
const SCRIPT_DIR = import.meta.dirname;

/** The script name relative to cwd for help messages */
const SCRIPT_NAME = path.relative(process.cwd(), import.meta.filename);

/** The default sync manifest file */
const SYNC_MANIFEST_DEFAULT = "sync-manifest.json";

/** Sync ignore filename to be in the root of the dependency in local repo */
const SYNC_IGNORE_FILE = ".syncignore";

/** Sync config filename to be in the root of the dependency in local repo */
const SYNC_CONFIG_FILE = "sync-config.json";

/** Sync working directory */
const SYNC_DIR = ".sync";

/** Checkpoint filename, created when merge conflict resolution is in progress.
 * Stored at .sync/<dep>/.sync-checkpoint.json */
const SYNC_CHECKPOINT_FILE = ".sync-checkpoint.json";

/** PR notes filename, written alongside sync-config.json */
const SYNC_PR_NOTES_FILE = "sync-pr-notes.md";

/** Merge result for paths that never run a merge (e.g. a first sync). */
const EMPTY_MERGE_RESULT: MergeResult = { resolved: [], conflicts: [] };

/** Git config key marking .sync/<dep>/ as a snapshot-mode repo. */
const SNAPSHOT_MODE_CONFIG_KEY = "forksync.fetchmode";

/** AI merge script filename */
const AI_MERGE_SCRIPT = import.meta.url.endsWith(".ts")
  ? "ai-merge.ts"
  : "ai-merge.js";

// =============================================================================
// Help Output
// =============================================================================

function printHelp(): void {
  console.log(`
${style.line()}
  ${style.heading("DEPENDENCY SYNC TOOL")}
  Copyright (c) Microsoft Corporation.
${style.line()}

${style.heading("Usage:")}
  ${style.command(`node ${SCRIPT_NAME}`)} [options]

${style.heading("Options:")}
  ${style.command("--dep")} <name>            Dependency name (${style.highlight("required")})
  ${style.command("--commit")} <hash>         Sync to specific commit (default: latest on branch)
  ${style.command("--tag")} <name>            Sync to tagged version (resolves to commit)
  ${style.command("--branch")} <name>         Target branch (default: from manifest)
  ${style.command("--manifest")} <path>       Manifest file (default: search from cwd upward)
  ${style.command("-C")}, ${style.command("--directory")} <path>  Working directory (default: cwd)
  ${style.command("--yes")}, ${style.command("-y")}               Answer yes to all confirmation prompts
  ${style.command("--clean")}                 Clean ${style.highlight(".sync/<dep>/")} directory before sync
  ${style.command("--no-sync")}               Skip sync (use with ${style.command("--clean")} to only clean)
  ${style.command("--no-local-git-check")}    Skip uncommitted changes verification
  ${style.command("--help")}, ${style.command("-h")}              Show this help message

${style.heading("Merge Control:")}
  ${style.command("--continue")}              Resume paused sync after resolving conflicts
  ${style.command("--abort")}                 Abort in-progress sync
  ${style.command("--status")}                Show sync checkpoint status
  ${style.command("--mergetool")} [mode]      Run merge tool for conflict resolution
                              ${style.highlight("ai")} (default): batch AI merge (all files in parallel)
                              ${style.highlight("git")}: use ${style.highlight("git mergetool")} (sequential, per file)

${style.heading("PR Creation:")}
  ${style.command("--create-pr")}             Create/update a PR with sync changes
  ${style.command("--dry-run")}               Do everything except push and PR create/update
  ${style.command("--pr-base")} <branch>      PR base branch (default: current branch)
  ${style.command("--pr-repo")} <owner/repo>  GitHub repo for gh CLI (default: auto-detect)

${style.heading("Pipeline:")}
  ${style.command("--pipeline")}              Implies ${style.command("--create-pr --yes --no-local-git-check")}

${style.heading("Logging:")}
  ${style.command("--log-dir")} <path>        Log file directory (default: ${style.highlight(".sync/.logs/")})
  ${style.command("--log-level")} <level>     Log level: ${style.highlight(VALID_LOG_LEVELS.join(", "))} (default: ${style.highlight("default")})

${style.line()}
`);
}

// =============================================================================
// CLI Argument Parsing
// =============================================================================

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      directory: { type: "string", short: "C" },
      manifest: { type: "string" },
      dep: { type: "string" },
      commit: { type: "string" },
      tag: { type: "string" },
      branch: { type: "string" },
      yes: { type: "boolean", default: false, short: "y" },
      clean: { type: "boolean", default: false },
      sync: { type: "boolean", default: true },
      "local-git-check": { type: "boolean", default: true },
      continue: { type: "boolean", default: false },
      abort: { type: "boolean", default: false },
      status: { type: "boolean", default: false },
      mergetool: { type: "string" },
      "create-pr": { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      "pr-base": { type: "string" },
      "pr-repo": { type: "string" },
      pipeline: { type: "boolean", default: false },
      "log-dir": { type: "string" },
      "log-level": { type: "string", default: "default" },
      help: { type: "boolean", default: false, short: "h" },
    },
    strict: true,
    allowNegative: true,
  });

  // Validate log level early
  validateLogLevel(values["log-level"] as string);

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  // --pipeline implies --create-pr --yes --no-local-git-check
  if (values.pipeline) {
    values["create-pr"] = true;
    values.yes = true;
    values["local-git-check"] = false;
  }

  return values;
}

// =============================================================================
// Type Definitions
// =============================================================================

export interface AiMergeConfig {
  /** AI CLI to use (default: "copilot"). */
  provider?: "copilot" | "claude";
  /**
   * Model, or an ordered preference list; ai-merge falls back to the next
   * entry when the CLI reports a model as not available. Copilot default:
   * "auto" (Copilot routes each request).
   */
  model?: string | string[];
  /** Copilot `--reasoning-effort` (default "low"; "default" = model's own). */
  reasoningEffort?: string;
  /** Minimum confidence to apply hunk: HIGH, MEDIUM (default), or LOW */
  minConfidence?: "HIGH" | "MEDIUM" | "LOW";
}

/** Dependency entry in the sync manifest. */
export interface Dependency {
  name: string;
  localPath: string;
}

/** Sync manifest file structure. */
export interface SyncManifest {
  version: 1;
  aiMerge?: AiMergeConfig;
  dependencies: Dependency[];
}

/**
 * Raw sync config stored in <localPath>/sync-config.json.
 * This file is auto-updated by sync.ts after each successful sync.
 */
interface SyncConfigFile {
  repo: string; // Full HTTPS URL, e.g., "https://github.com/nodejs/node"
  branch: string; // Target branch name
  commit?: string; // Last synced upstream commit hash (empty/absent = first sync)
  subDir?: string; // Subfolder within upstream repo (empty/absent = whole repo)
  // Multiple upstream directories to vendor, identity-mapped (each keeps its
  // repo-relative path under localPath). Materialized via sparse-checkout.
  // Mutually exclusive with subDir. Empty/absent = not used.
  sparsePaths?: string[];
  // Partial-clone filter for the upstream clone (git --filter=<value>).
  // Defaults to "blob:none". For very large repos vendored as a small subset,
  // "tree:0" defers trees too (fetched on demand at the sparse checkout), which
  // dramatically shrinks the initial clone — at the cost of on-demand fetches
  // during later history-walking operations (merge re-syncs, PR-note logs).
  cloneFilter?: string;
  // "history" (default): full-history partial clone of the upstream repo.
  // "snapshot": fetch only the base and target commits (depth 1, no blobs up
  // front) and merge synthetic snapshots; supports cross-branch targets.
  fetchMode?: FetchMode;
  // Git submodules (gitlink paths) whose content is synced at the SHAs the
  // upstream commit pins. Requires fetchMode "snapshot".
  submodules?: Record<string, { fallbackUrls?: string[] }>;
  // Files present at the base commit but missing locally stay missing, and
  // only files deleted by the merge are deleted locally. Requires "snapshot".
  keepLocalDeletions?: boolean;
  tag: string; // Tag name if synced to a tag (empty string otherwise)
  lastSync: string; // ISO timestamp of last sync (empty string if never synced)
}

/** How the upstream repo is fetched into .sync/<dep>/. */
type FetchMode = "history" | "snapshot";

/**
 * Fully resolved sync configuration.
 * Combines data from manifest and sync-config.json into a single object.
 * All paths are resolved. All required fields are validated.
 */
interface SyncConfig {
  // From manifest
  name: string;
  localPath: string; // Relative path as in manifest (e.g., "deps/nodejs")
  aiMerge?: AiMergeConfig;
  manifestPath: string; // Resolved absolute path to manifest
  manifestDir: string; // Directory containing manifest (anchor for relative paths)
  resolvedLocalPath: string; // Absolute path to local dependency

  // From sync-config.json
  repo: string;
  branch: string;
  baseCommit: string; // Empty string = first sync (no prior vendored content)
  tag: string;
  lastSync: string;
  subDir: string; // Normalized subfolder path, empty string = whole repo
  sparsePaths: string[]; // Normalized sparse-checkout paths, [] = not used
  cloneFilter: string; // git partial-clone filter, defaults to "blob:none"
  fetchMode: FetchMode;
  submodules: SubmoduleSpec[]; // Followed submodules, [] = none
  /** Raw `submodules` object, written back unchanged by saveSyncConfig. */
  submodulesRaw?: SyncConfigFile["submodules"];
  keepLocalDeletions: boolean;
}

/**
 * Checkpoint saved when sync pauses for merge conflict resolution.
 * File existence = sync in progress, awaiting `--continue`.
 * Stored at .sync/<dep>/.sync-checkpoint.json
 */
interface SyncCheckpoint {
  dependency: string;
  manifestPath: string;
  upstream: {
    repo: string;
    branch: string;
    targetCommit: string;
    baseCommit: string;
    tag?: string;
  };
  mergeBranches: {
    work: string;
    target: string;
  };
  /** Work branch commit before the merge (local overlay on the base). */
  workCommit?: string;
  /** Fingerprint of options that must not change while paused. */
  options?: string;
  /** Snapshot mode: resolved submodules and snapshot stats, for reporting. */
  snapshot?: {
    submodules: ResolvedSubmodule[];
    gitlinks: SnapshotResult["gitlinks"];
    pruned: SnapshotResult["pruned"];
    /** Tracked local files hidden by .syncignore that upstream also has. */
    frozen?: string[];
    /** Scopes with no local files yet, imported in full (keepLocalDeletions). */
    newlyFollowed?: string[];
  };
  startedAt: string;
}

type CliArgs = ReturnType<typeof parseCliArgs>;

// =============================================================================
// SyncSession Class
// =============================================================================

/**
 * Encapsulates all state and operations for a single sync session.
 * This reduces parameter passing and provides a clear structure for sync phases.
 */
class SyncSession {
  // === Immutable configuration (set in constructor) ===
  readonly config: SyncConfig;
  readonly args: CliArgs;
  readonly repoRoot: string;
  readonly mainRepo: GitRepo;

  // === Derived paths (computed in constructor) ===
  readonly syncPath: string;
  readonly localPath: string;
  readonly syncIgnorePath: string;
  readonly depPathPrefix: string;
  readonly subDirPrefix: string;
  readonly syncSubPath: string;
  /** Sparse-checkout paths (identity-mapped), empty when not used. */
  readonly sparsePaths: string[];
  /** Pathspec(s) scoping listing on the upstream (sync) side: the sparse paths
   * when set, else the single subDir, else [] (whole repo). In snapshot mode
   * the synthetic trees are already scoped, so only subDir is kept. */
  readonly syncPathspecs: string[];
  /** Snapshot mode: pathspecs selecting superproject entries for the trees. */
  readonly snapshotScope: string[];

  // === Git repo wrapper for the sync directory ===
  readonly syncRepo: GitRepo;

  // === Mutable state (set during sync phases) ===
  targetCommit!: string;
  targetBranch!: string;
  targetTag?: string;
  workBranch!: string;
  targetMergeBranch!: string;
  /** Commit the work branch starts from (base commit, or synthetic base). */
  workBaseCommit = "";
  /** Work branch commit after the local overlay, before the merge. */
  workCommit = "";
  /** Snapshot mode results (submodules, gitlink drift, prune stats). */
  snapshotInfo?: SyncCheckpoint["snapshot"];
  /** Per-submodule results for the summary and PR notes. */
  submoduleReports: SubmoduleReport[] = [];
  syncCheckpoint?: SyncCheckpoint;
  mergeResult!: MergeResult;
  changeStats!: ChangeStats;
  prNotes?: string;
  prNotesPath?: string;
  /** True when the sync session had no file changes, same commit, and same tag.
   * In this case sync-config.json and sync-pr-notes.md are left untouched. */
  noOpSync = false;

  constructor(config: SyncConfig, args: CliArgs, repoRoot: string) {
    this.config = config;
    this.args = args;
    this.repoRoot = repoRoot;
    this.mainRepo = new GitRepo(repoRoot);

    // Derive paths (manifest-relative)
    this.syncPath = path.join(config.manifestDir, SYNC_DIR, config.name);
    this.localPath = config.resolvedLocalPath;
    this.syncIgnorePath = path.join(this.localPath, SYNC_IGNORE_FILE);
    this.depPathPrefix = normalizePath(path.relative(repoRoot, this.localPath));
    this.syncRepo = new GitRepo(this.syncPath);
    this.subDirPrefix = config.subDir ? normalizePath(config.subDir) : "";
    this.syncSubPath = config.subDir
      ? path.join(this.syncPath, config.subDir)
      : this.syncPath;
    // sparsePaths are identity-mapped: no prefix stripping (syncSubPath stays at
    // the repo root), but the listing is scoped to the sparse paths.
    this.sparsePaths = config.sparsePaths;
    this.snapshotScope =
      this.sparsePaths.length > 0
        ? this.sparsePaths
        : this.subDirPrefix
          ? [this.subDirPrefix]
          : [];
    this.syncPathspecs = this.isSnapshot
      ? this.subDirPrefix
        ? [this.subDirPrefix]
        : []
      : this.snapshotScope;
    this.workBaseCommit = config.baseCommit;
  }

  /** True when the upstream is fetched as two snapshots (no history). */
  get isSnapshot(): boolean {
    return this.config.fetchMode === "snapshot";
  }

  /** True for the initial import of a dependency with no prior vendored content. */
  get isFirstSync(): boolean {
    return !this.config.baseCommit;
  }

  /**
   * Copy .syncignore into the sync repo so --exclude-per-directory can find it.
   * For subDir: copies to syncPath/subDir/.syncignore
   * For whole-repo: copies to syncPath/.syncignore
   * No-op if .syncignore does not exist locally.
   */
  private async copySyncIgnoreToSyncRepo(): Promise<void> {
    if (!(await exists(this.syncIgnorePath))) return;
    const destPath = path.join(this.syncSubPath, SYNC_IGNORE_FILE);
    await ensureDir(path.dirname(destPath));
    await fs.copyFile(this.syncIgnorePath, destPath);
  }

  /**
   * Main entry point for sync operations.
   * Shows the complete sync algorithm in one place.
   */
  async run(): Promise<void> {
    const checkpoint = await this.readSyncCheckpoint();

    if (this.args.status) {
      await this.printStatus();
      return;
    }

    if (this.args.abort) {
      await this.abortSyncInProgress();
      return;
    }

    if (!this.args.continue) {
      // === NEW SYNC: prepare and merge ===
      if (checkpoint) {
        await this.printStatus();
        if (!(await this.confirmAbortPreviousSync())) return;
        await this.abortSyncInProgress();
      }

      await this.validateLocalRepoState();

      this.printHeader("new");
      await this.ensureUpstreamClone();

      if (this.isFirstSync) {
        // === FIRST SYNC: direct import, no base commit, no 3-way merge ===
        await this.performFirstSync();
        this.mergeResult = EMPTY_MERGE_RESULT;
      } else {
        await this.generateBranchNames();
        if (this.isSnapshot) {
          await this.prepareSnapshot();
        } else {
          await this.createTargetBranch();
        }
        await this.createWorkBranch();
        await this.performMerge();
      }
    } else {
      // === CONTINUE: validate existing checkpoint ===
      await this.applySyncCheckpoint();
      this.printHeader("resume");
    }

    // A first sync cannot produce conflicts and has no merge commit to make.
    if (!this.isFirstSync) {
      if (!(await this.resolveConflictsOrPause())) {
        await this.printStatus();
        return;
      }
      await this.commitMergeIfNeeded();
    }

    await this.applyChanges();
    if (this.syncCheckpoint) await this.clearSyncCheckpoint();
    this.printSummary();

    if (this.args["create-pr"]) {
      await this.createPullRequest();
    }
  }

  // =============================================================================
  // Print functions for header, status, and summary
  // =============================================================================

  /**
   * Print the sync header with all relevant information.
   */
  private printHeader(mode: "new" | "resume"): void {
    const getTargetDescription = (): string => {
      if (this.args.commit) return `commit ${this.args.commit.slice(0, 8)}`;
      if (this.args.tag) return `tag ${this.args.tag}`;
      return `latest on ${this.args.branch ?? this.config.branch}`;
    };

    const getResumeInfo = (): string => {
      if (!this.syncCheckpoint) return "";
      return (
        `\n${style.label("Paused at:")}    ${this.syncCheckpoint.startedAt}\n${style.label("Branches:")}` +
        `     ${this.syncCheckpoint.mergeBranches.work} → ${this.syncCheckpoint.mergeBranches.target}`
      );
    };

    const title = mode === "new" ? "STARTING SYNC" : "RESUMING SYNC";
    const target =
      mode === "new"
        ? getTargetDescription()
        : (this.targetCommit?.slice(0, 8) ?? "unknown");

    print(
      () => `
${style.line()}
  ${style.heading(title)}
${style.line()}

${style.label("Dependency:")}   ${this.config.name}
${style.label("Local path:")}   ${this.config.localPath}
${style.label("Upstream:")}     ${this.config.repo}
${style.label("Work folder:")}  .sync/${this.config.name}/${this.isSnapshot ? ` (snapshot mode${this.config.submodules.length ? `, ${this.config.submodules.length} submodule(s)` : ""})` : ""}

${style.label("Target:")}       ${target}
${style.label("Base commit:")}  ${this.config.baseCommit.slice(0, 8)}${mode === "resume" ? getResumeInfo() : ""}
${style.line()}
`
    );
  }

  /**
   * Print sync status for this dependency.
   */
  private async printStatus(): Promise<void> {
    const checkpoint = this.syncCheckpoint;
    const depName = this.config.name;

    const header = () => `
${style.line()}
  ${style.heading("SYNC STATUS")}
${style.line()}`;

    if (!checkpoint) {
      print(
        () => `${header()}
No sync in progress for ${style.highlight(depName)}.
${style.line()}
`
      );
      return;
    }

    const shortTarget = checkpoint.upstream.targetCommit.slice(0, 8);
    const refName = checkpoint.upstream.tag || checkpoint.upstream.branch;

    // Get current conflict status from git
    const mergeResult = await this.syncRepo.getMergeResult();

    const conflictsSection = () => {
      if (mergeResult.conflicts.length === 0) {
        return style.success("No conflicts remaining - ready to continue");
      }
      const conflictFiles = mergeResult.conflicts
        .slice(0, 10)
        .map((file) => `  ${file}`)
        .join("\n");
      const moreFiles =
        mergeResult.conflicts.length > 10
          ? `\n  ... and ${mergeResult.conflicts.length - 10} more`
          : "";
      const resolvedInfo =
        mergeResult.resolved.length > 0
          ? `\n\n${style.success(`Resolved: ${mergeResult.resolved.length} merge conflicts`)}`
          : "";
      return (
        `${style.highlight(`${mergeResult.conflicts.length} files have merge conflicts in .sync/${depName}/:`)}` +
        `\n${conflictFiles}${moreFiles}${resolvedInfo}`
      );
    };

    print(
      () => `${header()}
${style.label("Dependency:")}   ${checkpoint.dependency}
${style.label("Target:")}       ${checkpoint.upstream.repo} @ ${style.command(shortTarget)} (${refName})
${style.label("Started:")}      ${checkpoint.startedAt}
${style.label("Work folder:")}  .sync/${checkpoint.dependency}/

${conflictsSection()}

To resolve:
  ${style.command(`cd .sync/${depName}`)}
  ${style.command("git mergetool")}          # Or use your preferred merge tool

After resolving all conflicts:
  ${style.command(`node ${SCRIPT_NAME} --continue --dep ${depName}`)}

To abort this sync:
  ${style.command(`node ${SCRIPT_NAME} --abort --dep ${depName}`)}
${style.line()}
`
    );
  }

  /**
   * Print final sync summary.
   */
  private printSummary(): void {
    const depName = this.config.name;
    const shortCommit = this.targetCommit.slice(0, 8);
    const refName = this.targetTag || this.targetBranch;
    const localPath = this.config.localPath;

    if (this.noOpSync) {
      print(
        () => `
${style.line()}
  ${style.heading("SYNC COMPLETE")}
${style.line()}

Upstream: ${this.config.repo}
  Commit: ${style.command(shortCommit)} (${refName})

${style.success("Already up to date — 0 files updated.")}
sync-config.json and PR notes left untouched.

${style.line()}
`
      );
      return;
    }

    const { modified, added, deleted } = this.changeStats;
    const totalChanges = modified + added + deleted;

    // Build change lines conditionally
    const changeLines = () => {
      const result: string[] = [];
      if (modified > 0)
        result.push(` ${style.label("Modified:")} ${modified} files`);
      if (added > 0) result.push(` ${style.label("Added:")}    ${added} files`);
      if (deleted > 0)
        result.push(` ${style.label("Deleted:")}  ${deleted} files`);
      return result;
    };

    const changesSection = () =>
      totalChanges > 0
        ? `Changes to ${localPath}/:\n${changeLines().join("\n")}`
        : `No changes to ${localPath}/`;

    const resolvedSection = () =>
      this.mergeResult.resolved.length > 0
        ? `\n\n${style.success(`Resolved: ${this.mergeResult.resolved.length} merge conflict(s)`)}`
        : "";

    const submoduleSection = () => {
      if (this.submoduleReports.length === 0) return "";
      const rows = this.submoduleReports.map((r) => {
        const pin =
          r.baseSha === r.targetSha
            ? `${r.targetSha.slice(0, 12)} (unchanged)`
            : `${r.baseSha ? r.baseSha.slice(0, 12) : "(new)"} → ${r.targetSha.slice(0, 12)}`;
        const { modified, added, deleted } = r.changes;
        const fallback = r.servedUrl !== r.url ? ` [via ${r.servedUrl}]` : "";
        const moved =
          r.baseUrl && r.baseUrl !== r.url
            ? ` [URL changed from ${r.baseUrl}]`
            : "";
        return `  ${r.path}: ${pin}, ${modified}M ${added}A ${deleted}D${fallback}${moved}`;
      });
      return `\n\n${style.label("Submodules:")}\n${rows.join("\n")}`;
    };

    const prunedSection = () => {
      const newly = this.snapshotInfo?.newlyFollowed ?? [];
      const newlyText =
        newly.length > 0
          ? `\n\nNewly followed, imported in full: ${newly.join(", ")}`
          : "";
      const pruned = this.snapshotInfo?.pruned;
      if (!this.config.keepLocalDeletions || !pruned || pruned.count === 0) {
        return newlyText;
      }
      return (
        newlyText +
        `\n\n${pruned.count} locally removed file(s) kept out` +
        (pruned.changedUpstream > 0
          ? ` (${pruned.changedUpstream} changed or removed upstream)`
          : "")
      );
    };

    const footerMessage = () =>
      totalChanges > 0
        ? `Use ${style.command(`git diff ${localPath}/`)} to review changes.`
        : style.success("Already up to date.");

    // A first sync runs no 3-way merge, so there are no merge branches to keep.
    const mergeBranchesSection = () =>
      this.isFirstSync
        ? ""
        : `\nMerge branches preserved in .sync/${depName}/:\n` +
          `  - ${this.workBranch} (work branch — merge result)\n` +
          `  - ${this.targetMergeBranch} (target branch)\n`;

    print(
      () => `
${style.line()}
  ${style.heading("SYNC COMPLETE")}
${style.line()}

Upstream: ${this.config.repo}
  Commit: ${style.command(shortCommit)} (${refName})

${changesSection()}${resolvedSection()}${submoduleSection()}${prunedSection()}
${mergeBranchesSection()}
${style.line()}
${footerMessage()}
${style.line()}
`
    );
  }

  // ============================================================================
  // PR creation (called from run() when --create-pr is set)
  // ============================================================================

  /**
   * Create or update a pull request with the sync changes.
   * Creates a branch, commits, pushes, and opens/updates a PR via gh CLI.
   */
  private async createPullRequest(): Promise<void> {
    const label = () => style.label("PR:");
    using job = jobs.addJob("create-pr", () => `${label()} creating PR...`);

    const depName = this.config.name;
    const shortCommit = this.targetCommit.slice(0, 8);
    const refName = this.targetTag || this.args.branch || this.config.branch;
    const prBranch = `fork-sync/${depName}`;
    const prTitle = `fork-sync: sync ${depName} to ${shortCommit} (${refName})`;
    const prBody = this.prNotes ?? "";
    const isDryRun = this.args["dry-run"] ?? false;

    // Check gh is available
    job.step("Checking gh CLI...");
    try {
      await exec("gh --version");
    } catch {
      return fatal(
        `GitHub CLI (gh) is required for --create-pr.\n` +
          `Install from: https://cli.github.com/`
      );
    }

    // Detect remote and GitHub repo
    job.step("Detecting remote...");
    const ghRepo = await this.detectGitHubRepo();

    // No-op sync: do not reset, stage, commit, or push. If a previous sync PR
    // is still open, update its body to a "now up to date" note and close it.
    // Otherwise just report that there's nothing to PR.
    if (this.noOpSync) {
      job.step("Checking for existing PR...");
      const existingPR = await findPR({
        head: prBranch,
        cwd: this.repoRoot,
        repo: ghRepo,
      });

      if (!existingPR) {
        info(() => `${label()} Nothing to PR — already up to date.`);
        job.done(() => `${label()} nothing to PR`);
        return;
      }

      const closeBody =
        `fork-sync: ${depName} is now up to date with ` +
        `\`${shortCommit}\` (${refName}). Closing this PR — no changes to merge.`;

      if (isDryRun) {
        info(
          () =>
            `${label()} Dry run: would update and close PR #${existingPR.number}`
        );
        job.done(() => `${label()} dry run complete`);
        return;
      }

      job.step(`Closing PR #${existingPR.number}...`);
      await closePR({
        number: existingPR.number,
        body: closeBody,
        cwd: this.repoRoot,
        repo: ghRepo,
      });
      info(() => `${label()} Closed PR: ${existingPR.url}`);
      job.done(() => `${label()} closed PR #${existingPR.number}`);
      return;
    }

    // Save current branch for restoration
    const originalBranch = await this.mainRepo.currentBranch();

    try {
      // Create/reset the PR branch from current HEAD
      job.step(`Creating branch ${prBranch}...`);
      await this.mainRepo.checkoutNewBranchForce(prBranch);

      // Stage all sync changes under localPath/
      job.step("Staging changes...");
      await this.mainRepo.stage(this.config.localPath + "/");

      // Commit
      job.step("Committing...");
      await this.mainRepo.commit(prTitle);

      if (isDryRun) {
        info(
          () =>
            `${label()} Dry run: would push ${prBranch} and create/update PR`
        );
        job.done(() => `${label()} dry run complete`);
        return;
      }

      // Force-push
      job.step("Pushing...");
      await this.mainRepo.push("origin", prBranch, { force: true });

      // Find existing PR
      job.step("Checking for existing PR...");
      const existingPR = await findPR({
        head: prBranch,
        cwd: this.repoRoot,
        repo: ghRepo,
      });

      if (existingPR) {
        // Update existing PR
        job.step(`Updating PR #${existingPR.number}...`);
        await updatePR({
          number: existingPR.number,
          title: prTitle,
          body: prBody,
          cwd: this.repoRoot,
          repo: ghRepo,
        });
        info(() => `${label()} Updated PR: ${existingPR.url}`);
        job.done(() => `${label()} updated PR #${existingPR.number}`);
      } else {
        // Create new PR
        const prBase = this.args["pr-base"] ?? originalBranch;
        job.step("Creating PR...");
        const newPR = await createPR({
          head: prBranch,
          base: prBase,
          title: prTitle,
          body: prBody,
          cwd: this.repoRoot,
          repo: ghRepo,
        });
        info(() => `${label()} Created PR: ${newPR.url}`);
        job.done(() => `${label()} created PR #${newPR.number}`);
      }
    } finally {
      // Restore original branch
      try {
        await this.mainRepo.checkout(originalBranch);
      } catch {
        warn(
          () =>
            `Failed to restore branch ${originalBranch}. You may need to checkout manually.`
        );
      }
    }
  }

  /**
   * Detect the GitHub repo identifier (owner/repo) for gh CLI.
   * Uses --pr-repo if provided, otherwise extracts from origin remote URL.
   */
  private async detectGitHubRepo(): Promise<string | undefined> {
    if (this.args["pr-repo"]) {
      return this.args["pr-repo"];
    }

    // Try to extract from origin remote URL
    const remoteOutput = await this.mainRepo.remoteList();
    if (!remoteOutput) return undefined;

    // Parse remote -v output: "origin\thttps://github.com/owner/repo.git (fetch)"
    for (const line of remoteOutput.split("\n")) {
      const match = line.match(
        /^origin\t.*github\.com[:/]([^/]+\/[^/\s]+?)(?:\.git)?\s/
      );
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  // ============================================================================
  // Sync phase methods (called from run())
  // Each method encapsulates one phase of the sync process for clarity.
  // ============================================================================

  /**
   * Abort an in-progress sync for this dependency.
   */
  private async abortSyncInProgress(): Promise<void> {
    const label = () => style.label("Abort:");
    using job = jobs.addJob("abort", () => `${label()} aborting sync...`);

    const hasRepo = await isGitRepo(this.syncPath);

    if (!hasRepo && !this.syncCheckpoint) {
      job.done(
        () => `${label()} no sync in progress for "${this.config.name}"`
      );
      return;
    }

    // Reset the sync directory to clean state
    if (hasRepo) {
      job.step("Resetting sync directory...");
      await this.syncRepo.resetHard();
      await this.syncRepo.cleanFd();
      await this.syncRepo.checkoutDetach("HEAD");
    }

    if (this.syncCheckpoint) {
      job.step("Cleaning up checkpoint...");
      await this.clearSyncCheckpoint();
    }

    job.done(() => `${label()} sync aborted, local files unchanged`);
  }

  /**
   * If a previous sync is in progress, ask the user to abort it or bail out.
   * @returns true if we should proceed (aborted or no previous sync), false to bail out.
   */
  private async confirmAbortPreviousSync(): Promise<boolean> {
    warn(`A sync is already in progress for "${this.config.name}".`);
    const shouldAbort = await confirm("Abort previous sync and start fresh?", {
      yes: this.args.yes,
    });

    if (!shouldAbort) {
      info(
        `Use --continue --dep ${this.config.name} to resume the paused sync.`
      );
      return false;
    }

    return true;
  }

  /**
   * Validate that the local repository is in a clean git state before syncing.
   */
  private async validateLocalRepoState(): Promise<void> {
    const label = () => style.label("Validate:");
    using job = jobs.addJob(
      "validate",
      () => `${label()} checking local repo...`
    );

    if (!this.args["local-git-check"]) {
      job.done(() => `${label()} skipped (--no-local-git-check)`);
      return;
    }

    job.step("Checking git status...");
    if (!(await isGitRepo(this.repoRoot))) {
      job.done({
        state: "failed",
        message: () => `${label()} not a git repository`,
      });
      return fatal(
        "Failed to check local repository git status. Is this a git repository?"
      );
    }
    const status = await this.mainRepo.statusPorcelain();

    if (status.includes(".sync/")) {
      job.done({
        state: "failed",
        message: () => `${label()} .sync/ has uncommitted changes`,
      });
      return fatal(
        ".sync/ directory has uncommitted changes in local repository.\n" +
          "Please add .sync/ to your .gitignore file:\n" +
          '  echo ".sync/" >> .gitignore'
      );
    }

    if (status) {
      job.done({
        state: "failed",
        message: () => `${label()} uncommitted changes`,
      });
      return fatal(
        "Your local repository has uncommitted changes.\n" +
          "Please commit or stash them before syncing.\n" +
          "This ensures sync changes are isolated and reviewable."
      );
    }

    job.done(() => `${label()} local repo is clean`);
  }

  /**
   * Ensure the upstream clone exists and is up to date.
   */
  private async ensureUpstreamClone(): Promise<void> {
    if (this.isSnapshot) {
      await this.ensureSnapshotRepo();
      return;
    }

    const label = () => style.label("Upstream clone:");
    using job = jobs.addJob("upstream-clone", () => `${label()} setting up...`);

    job.step("Validating cached clone...");
    let repoExists = await isGitRepo(this.syncPath);
    const originValidation = repoExists
      ? await validateCloneOrigin(this.syncRepo, this.config.repo)
      : { valid: true, currentOrigin: undefined };

    // A snapshot-mode repo (shallow, no history) cannot serve history mode.
    if (
      repoExists &&
      originValidation.valid &&
      (await this.syncRepo.configGet(SNAPSHOT_MODE_CONFIG_KEY))
    ) {
      job.warn(
        `Cached repo at .sync/${this.config.name}/ is a snapshot-mode repo and cannot be used in history mode.`
      );
      const answer = await confirm(
        "Delete it and clone the upstream history?",
        { yes: this.args.yes }
      );
      if (!answer) {
        job.done({ state: "failed", message: () => `${label()} not reusable` });
        return fatal(
          `Cannot proceed: .sync/${this.config.name}/ must be replaced for history mode.`
        );
      }
      job.step("Removing snapshot repo...");
      await removeDir(this.syncPath);
      repoExists = false;
    }

    if (!originValidation.valid && repoExists) {
      job.warn(
        () => `Cached clone origin mismatch!
  ${style.label("Expected:")} ${this.config.repo}
  ${style.label("Current:")} ${originValidation.currentOrigin}`
      );

      const answer = await confirm(
        "Delete cached clone and re-clone from correct repo?",
        {
          yes: this.args.yes,
        }
      );
      if (!answer) {
        job.done({
          state: "failed",
          message: () => `${label()} origin mismatch`,
        });
        fatal(
          "Cannot proceed with mismatched origin. Please manually fix or allow re-clone."
        );
      }
      job.step("Removing mismatched clone...");
      await removeDir(this.syncPath);
      repoExists = false;
    }

    if (repoExists) {
      // Reset any dirty state (leftover .ai_orig files, uncommitted changes, etc.)
      job.step("Resetting sync directory...");
      await this.syncRepo.resetHard();
      await this.syncRepo.cleanFd();

      job.step("Fetching latest from upstream...");
      await this.syncRepo.fetch();

      // Configure sparse checkout for subDir / sparsePaths (if applicable)
      if (this.syncPathspecs.length > 0) {
        job.step("Configuring sparse checkout...");
        await this.syncRepo.sparseCheckoutInit();
        await this.syncRepo.sparseCheckoutSet(...this.syncPathspecs);
      }

      job.done(() => `${label()} fetched latest from ${this.config.repo}`);
    } else {
      // Ensure URL ends with .git for cloning
      const cloneUrl = this.config.repo.endsWith(".git")
        ? this.config.repo
        : `${this.config.repo}.git`;

      await ensureDir(path.dirname(this.syncPath));
      // Partial clone to reduce initial download (default blob:none; "tree:0"
      // for huge repos vendored as a small subset). When sparse paths are
      // configured, skip the initial checkout so the whole default branch isn't
      // materialized before sparse-checkout narrows it — the hydration then
      // happens once, at the later sparse target checkout. Show progress via
      // interactive mode.
      const useSparse = this.syncPathspecs.length > 0;
      const cloneStep = job.step("Cloning repository...");
      for await (const chunk of clone(cloneUrl, this.syncPath, {
        filter: this.config.cloneFilter,
        noCheckout: useSparse,
        cwd: this.repoRoot,
      })) {
        cloneStep.update(chunk.text.trim());
      }

      // Configure sparse checkout for subDir / sparsePaths (if applicable)
      if (this.syncPathspecs.length > 0) {
        job.step("Configuring sparse checkout...");
        await this.syncRepo.sparseCheckoutInit();
        await this.syncRepo.sparseCheckoutSet(...this.syncPathspecs);
      }

      job.done(() => `${label()} cloned ${this.config.repo}`);
    }
  }

  /**
   * Snapshot mode: ensure .sync/<dep>/ is a plain repo with the upstream as
   * `origin` and no sparse checkout (the synthetic trees are already scoped).
   * Objects are fetched later, once the base and target SHAs are known. A
   * cached history-mode clone is replaced, since it is not reusable here.
   */
  private async ensureSnapshotRepo(): Promise<void> {
    const label = () => style.label("Upstream repo:");
    using job = jobs.addJob("upstream-clone", () => `${label()} setting up...`);

    let repoExists = await isGitRepo(this.syncPath);
    if (repoExists) {
      job.step("Validating cached repo...");
      const origin = await validateCloneOrigin(this.syncRepo, this.config.repo);
      const mode = await this.syncRepo.configGet(SNAPSHOT_MODE_CONFIG_KEY);
      const partial = await this.syncRepo.configGet("remote.origin.promisor");
      if (!origin.valid || mode !== "snapshot" || partial) {
        const reason = !origin.valid
          ? `origin is ${origin.currentOrigin}, expected ${this.config.repo}`
          : mode !== "snapshot"
            ? "it is a history-mode clone"
            : "it is a partial clone";
        job.warn(
          `Cached repo at .sync/${this.config.name}/ is not reusable: ${reason}.`
        );
        const answer = await confirm("Delete it and start a snapshot repo?", {
          yes: this.args.yes,
        });
        if (!answer) {
          job.done({
            state: "failed",
            message: () => `${label()} not reusable`,
          });
          return fatal(
            `Cannot proceed: .sync/${this.config.name}/ must be replaced for snapshot mode.`
          );
        }
        job.step("Removing cached repo...");
        await removeDir(this.syncPath);
        repoExists = false;
      }
    }

    if (repoExists) {
      job.step("Resetting sync directory...");
      await this.syncRepo.resetHard();
      await this.syncRepo.cleanFd();
      job.done(() => `${label()} reusing .sync/${this.config.name}/`);
      return;
    }

    job.step("Initializing snapshot repo...");
    await ensureDir(this.syncPath);
    await spawn("git", ["init", "--quiet"], { cwd: this.syncPath });
    await this.syncRepo.configSet(
      "remote.origin.url",
      toCloneUrl(this.config.repo)
    );
    await this.syncRepo.configSet(SNAPSHOT_MODE_CONFIG_KEY, "snapshot");
    job.done(() => `${label()} initialized .sync/${this.config.name}/`);
  }

  /**
   * Snapshot mode: resolve the target via `ls-remote`, fetch the base and
   * target snapshots, resolve and fetch followed submodules, and write the
   * synthetic base/target commits. Sets {@link workBaseCommit} and creates the
   * target merge branch (first sync: just checks out the target).
   */
  private async prepareSnapshot(): Promise<void> {
    const label = () => style.label("Snapshot:");
    using job = jobs.addJob("snapshot", () => `${label()} preparing...`);

    await this.resolveTargetRemote(job);

    const base = this.config.baseCommit;
    const shas = [...new Set([base, this.targetCommit].filter(Boolean))];
    job.step(`Fetching ${shas.map((s) => s.slice(0, 8)).join(" and ")}...`);
    // Full snapshots (no blob filter): fetching blobs later by object ID makes
    // some servers (e.g. googlesource) prove reachability per object, which
    // takes minutes for old commits. Wanting the commits themselves does not.
    try {
      await this.syncRepo.fetchRefs("origin", shas, {
        depth: 1,
        noTags: true,
      });
    } catch (e) {
      job.done({ state: "failed", message: () => `${label()} fetch failed` });
      return fatal(
        `Could not fetch ${shas.join(" and ")} from ${this.config.repo}:\n` +
          ((e as Error).message ?? String(e))
      );
    }
    for (const sha of shas) {
      if (!(await this.syncRepo.hasCommit(sha))) {
        job.done({ state: "failed", message: () => `${label()} fetch failed` });
        return fatal(
          `Upstream commit ${sha} could not be fetched from ${this.config.repo}.`
        );
      }
    }

    let submodules: ResolvedSubmodule[] = [];
    if (this.config.submodules.length > 0) {
      job.step("Resolving submodules...");
      submodules = await resolveSubmodules(
        this.syncRepo,
        this.config.repo,
        this.config.submodules,
        base,
        this.targetCommit
      );
      await fetchSubmodules(this.syncRepo, submodules, this.config.submodules, {
        onProgress: (message) => job.step(message),
        // A local superproject (e.g. a test fixture) may use local
        // submodule URLs; a remote one may not.
        allowLocalUrls:
          /^file:/i.test(this.config.repo) || path.isAbsolute(this.config.repo),
      });
    }

    let isPruned: ((p: string) => boolean) | undefined;
    const frozen: string[] = [];
    const newScopes: string[] = [];
    if (this.config.keepLocalDeletions && base) {
      job.step("Listing local files...");
      const localFiles = new Set(
        await getAllowedRelativePaths(
          this.mainRepo,
          this.syncIgnorePath,
          this.depPathPrefix,
          this.depPathPrefix
        )
      );
      // Tracked local files hidden by .syncignore: if upstream has them too,
      // they would silently never update. Collected for a warning.
      const tracked = await getAllowedRelativePaths(
        this.mainRepo,
        undefined,
        this.depPathPrefix,
        this.depPathPrefix
      );
      const ignoredTracked = new Set(tracked.filter((f) => !localFiles.has(f)));
      // A followed submodule or sparse path with no local files at all was
      // just added to the config: import it in full instead of treating its
      // upstream files as pruned.
      const hasLocalUnder = (scope: string) => {
        if (localFiles.has(scope)) return true;
        for (const f of localFiles) if (f.startsWith(`${scope}/`)) return true;
        return false;
      };
      for (const scope of [
        ...this.config.sparsePaths,
        ...this.config.submodules.map((s) => s.path),
      ]) {
        if (!hasLocalUnder(scope)) newScopes.push(scope);
      }
      const prefix = this.subDirPrefix ? `${this.subDirPrefix}/` : "";
      isPruned = (upstreamPath) => {
        if (prefix && !upstreamPath.startsWith(prefix)) return true;
        const local = upstreamPath.slice(prefix.length);
        if (localFiles.has(local)) return false;
        if (newScopes.some((s) => local === s || local.startsWith(`${s}/`))) {
          return false;
        }
        if (ignoredTracked.has(local)) frozen.push(local);
        return true;
      };
    }

    job.step("Writing snapshot commits...");
    const snapshot = await buildSnapshotCommits({
      repo: this.syncRepo,
      scope: this.snapshotScope,
      submodules,
      baseCommit: base,
      targetCommit: this.targetCommit,
      isPruned,
    });
    this.snapshotInfo = {
      submodules,
      gitlinks: snapshot.gitlinks,
      pruned: snapshot.pruned,
      frozen: frozen.sort(),
      newlyFollowed: newScopes,
    };
    if (newScopes.length > 0) {
      job.step(`Newly followed (imported in full): ${newScopes.join(", ")}`);
    }
    if (frozen.length > 0) {
      job.warn(
        `${frozen.length} vendored file(s) are excluded by .syncignore but exist upstream; ` +
          `they will not be updated (e.g. ${frozen.slice(0, 3).join(", ")}). ` +
          `Re-include them with a '!' pattern if they should follow upstream.`
      );
    }

    if (this.isFirstSync) {
      job.step(`Checking out target snapshot...`);
      await this.syncRepo.checkout(snapshot.targetCommit);
    } else {
      this.workBaseCommit = snapshot.baseCommit;
      job.step(`Creating branch ${this.targetMergeBranch}...`);
      await this.syncRepo.branchForce(
        this.targetMergeBranch,
        snapshot.targetCommit
      );
    }

    const subText =
      submodules.length > 0 ? `, ${submodules.length} submodule(s)` : "";
    const pruneText = isPruned
      ? `, ${snapshot.pruned.count} pruned path(s) kept out`
      : "";
    job.done(
      () =>
        `${label()} ${base ? `${base.slice(0, 8)} → ` : ""}${this.targetCommit.slice(0, 8)}${
          this.targetTag ? ` (${this.targetTag})` : ""
        }${subText}${pruneText}`
    );
  }

  /**
   * Snapshot mode target resolution through the remote (no local refs):
   * `--commit` must be a full SHA, `--tag` and the branch go via `ls-remote`.
   */
  private async resolveTargetRemote(job: Job): Promise<void> {
    this.targetBranch = this.args.branch ?? this.config.branch;
    this.targetTag = this.args.tag;

    if (this.args.commit) {
      if (!/^[0-9a-f]{40}([0-9a-f]{24})?$/i.test(this.args.commit)) {
        return fatal(
          `--commit must be a full commit SHA in snapshot mode (got '${this.args.commit}').`
        );
      }
      this.targetCommit = this.args.commit.toLowerCase();
      job.step(
        `Using specified target commit: ${this.targetCommit.slice(0, 8)}`
      );
      return;
    }

    const ref = this.args.tag
      ? `refs/tags/${this.args.tag}`
      : `refs/heads/${this.targetBranch}`;
    job.step(`Resolving ${ref} on ${this.config.repo}...`);
    const commit = await resolveRemoteRef(this.syncRepo, "origin", ref);
    if (!commit) {
      return fatal(
        this.args.tag
          ? `Tag '${this.args.tag}' not found on ${this.config.repo}.`
          : `Branch '${this.targetBranch}' not found on ${this.config.repo}.`
      );
    }
    this.targetCommit = commit;
    job.step(`${ref} → ${commit.slice(0, 8)}`);
  }

  /**
   * Generate branch names for this sync session. The timestamp has one-second
   * resolution, so a numeric suffix keeps names unique when syncs run back to
   * back (merge branches of earlier syncs are kept for inspection).
   */
  private async generateBranchNames(): Promise<void> {
    const syncId = getTimestampForFile();
    for (let n = 1; ; n++) {
      const id = n === 1 ? syncId : `${syncId}_${n}`;
      const work = `work_${id}`;
      const target = `target_${id}`;
      if (
        !(await this.syncRepo.revParse(`refs/heads/${work}`)) &&
        !(await this.syncRepo.revParse(`refs/heads/${target}`))
      ) {
        this.workBranch = work;
        this.targetMergeBranch = target;
        break;
      }
    }
    debug(`Work branch:   ${this.workBranch}`);
    debug(`Target branch: ${this.targetMergeBranch}`);
  }

  /**
   * Perform a first sync: the initial import of a dependency with no prior
   * vendored content (empty base commit). There is no base to diff against and
   * no 3-way merge — we just resolve the target, check it out (the sparse cone,
   * if any, is already configured), and let {@link applyChanges} copy the
   * selected files into the local path. `.syncignore` still applies.
   */
  private async performFirstSync(): Promise<void> {
    if (this.isSnapshot) {
      await this.prepareSnapshot();
      await this.copySyncIgnoreToSyncRepo();
      return;
    }

    const label = () => style.label("First sync:");
    using job = jobs.addJob("first-sync", () => `${label()} importing...`);

    await this.resolveTarget(job);

    job.step(`Checking out target commit ${this.targetCommit.slice(0, 8)}...`);
    await this.syncRepo.checkout(this.targetCommit);

    // Make .syncignore visible inside the sync repo so applyChanges' listing
    // honors exclusions (matches createWorkBranch for the merge path).
    await this.copySyncIgnoreToSyncRepo();

    job.done(
      () =>
        `${label()} imported upstream at ${this.targetCommit.slice(0, 8)}${
          this.targetTag ? ` (${this.targetTag})` : ""
        }`
    );
  }

  /**
   * Create target branch and validate ancestry.
   * Resolves the target commit, validates that the base commit is an ancestor,
   * then creates a branch at the target commit.
   */
  private async createTargetBranch(): Promise<void> {
    const label = () => style.label("Target branch:");
    using job = jobs.addJob("target-branch", () => `${label()} creating...`);

    await this.resolveTarget(job);

    // Validate that base commit is an ancestor of target (fail fast before file copy)
    job.step("Validating commit ancestry...");
    const isAncestor = await this.syncRepo.mergeBaseIsAncestor(
      this.config.baseCommit,
      this.targetCommit
    );
    if (!isAncestor) {
      job.done({
        state: "failed",
        message: () => `${label()} ancestry check failed`,
      });
      fatal(
        `Cannot sync: base commit ${this.config.baseCommit.slice(0, 8)} is not an ancestor of target commit ${this.targetCommit.slice(0, 8)}.\n` +
          `This can happen if the sync config was manually edited or the upstream branch was force-pushed.\n` +
          `To fix: update the commit in sync-config.json to a valid ancestor, or reset to a known good state.`
      );
    }

    job.step(`Checking out target commit ${this.targetCommit.slice(0, 8)}...`);
    await this.syncRepo.checkout(this.targetCommit);

    job.step(`Creating branch ${this.targetMergeBranch}...`);
    await this.syncRepo.checkoutNewBranch(this.targetMergeBranch);

    job.done(
      () =>
        `${label()} created ${this.targetMergeBranch} at ${this.targetCommit.slice(0, 8)}`
    );
  }

  /**
   * Resolves the target commit hash from a direct commit, tag, or branch head.
   * When no explicit `--tag` is given, also auto-fills `targetTag` from any
   * upstream tag pointing at the resolved commit (see {@link pickTag}).
   */
  private async resolveTarget(job: Job): Promise<void> {
    this.targetBranch = this.args.branch ?? this.config.branch;
    this.targetTag = this.args.tag;

    if (this.args.commit) {
      // Commit specified directly
      job.step(
        `Using specified target commit: ${this.args.commit.slice(0, 8)}`
      );
      this.targetCommit = this.args.commit;
      // Commits only reachable from refs `git fetch origin` skips (e.g.
      // release branches outside refs/heads) must be fetched by SHA.
      if (
        /^[0-9a-f]{40}([0-9a-f]{24})?$/i.test(this.args.commit) &&
        !(await this.syncRepo.hasCommit(this.args.commit))
      ) {
        job.step(`Fetching commit ${this.args.commit.slice(0, 8)}...`);
        await this.syncRepo.fetchRefs("origin", [this.args.commit], {
          noTags: true,
        });
      }
    } else if (this.args.tag) {
      // Tag specified — resolve to commit using local refs
      job.step(`Resolving target tag ${this.args.tag}...`);
      // git rev-list -n 1 handles both lightweight and annotated tags
      let commit = await this.syncRepo.revList(`refs/tags/${this.args.tag}`, {
        count: 1,
      });
      if (!commit) {
        // Tags on commits outside the fetched branches are not auto-followed
        // by `git fetch origin`; fetch this one explicitly.
        job.step(`Fetching tag ${this.args.tag}...`);
        const tagRef = `refs/tags/${this.args.tag}`;
        let fetchError = "";
        try {
          await this.syncRepo.fetchRefs("origin", [`+${tagRef}:${tagRef}`], {
            noTags: true,
          });
        } catch (e) {
          fetchError = (e as Error).message ?? String(e);
        }
        commit = await this.syncRepo.revList(tagRef, { count: 1 });
        if (!commit && fetchError) {
          fatal(
            `Could not fetch tag '${this.args.tag}' from origin:\n${fetchError}`
          );
        }
      }
      if (!commit) {
        fatal(
          `Tag '${this.args.tag}' not found in local clone or on origin.\n` +
            `Try running: git fetch origin --tags (in ${this.syncPath})`
        );
      }
      job.step(`Tag ${this.args.tag} resolved to ${commit.slice(0, 8)}`);
      this.targetCommit = commit;
    } else {
      // Otherwise, get HEAD of branch from local refs
      job.step(`Resolving HEAD of branch ${this.targetBranch}...`);
      const commit = await this.syncRepo.revParse(
        `origin/${this.targetBranch}`
      );
      if (!commit) {
        fatal(
          `Branch '${this.targetBranch}' not found in local clone.\n` +
            `Check that it exists on origin, or run: git fetch origin (in ${this.syncPath})`
        );
      }
      job.step(
        `Using latest commit ${commit.slice(0, 8)} from branch ${this.targetBranch}`
      );
      this.targetCommit = commit;
    }

    // Auto-resolve tag for the target commit when the user did not pass --tag.
    // Picks a tag that points at the commit, biased toward the existing tag's
    // shape (longest common prefix). Falls back to "" when none exist.
    if (this.targetTag === undefined) {
      const candidates = await this.syncRepo.tagsPointingAt(this.targetCommit);
      const picked = pickTag(candidates, this.config.tag);
      if (picked) {
        if (candidates.length > 1) {
          job.step(
            `Auto-selected tag ${picked} from ${candidates.length} candidates`
          );
        } else {
          job.step(`Auto-detected tag ${picked} at target commit`);
        }
      }
      this.targetTag = picked;
    }
  }

  /**
   * Create work branch from base commit with local changes applied.
   * Checks out the base commit, creates a branch, copies local changes, and commits them.
   */
  private async createWorkBranch(): Promise<void> {
    const label = () => style.label("Work branch:");
    using job = jobs.addJob("work-branch", () => `${label()} creating...`);

    job.step(
      `Checking out base ${this.isSnapshot ? "snapshot" : "commit"} ${this.workBaseCommit.slice(0, 8)}...`
    );
    await this.syncRepo.checkout(this.workBaseCommit);

    job.step(`Creating branch ${this.workBranch}...`);
    await this.syncRepo.checkoutNewBranch(this.workBranch);

    // Copy .syncignore so exclusion patterns work inside the sync repo
    await this.copySyncIgnoreToSyncRepo();

    job.step("Computing file differences...");
    const { localHashes, syncHashes } = await this.getFileHashMaps();
    const filesToCopy = await this.computeChangedPaths(
      localHashes,
      syncHashes,
      this.localPath,
      this.syncSubPath
    );

    let copied = 0;
    let lastCopied = "";
    const ttyText = `Copying ${filesToCopy.length} local files...`;
    const copyStep = job.step(
      ttyOrLog(ttyText, () =>
        copied === 0 ? ttyText : `${copied}: ${lastCopied}`
      ),
      { progressBar: 0 }
    );
    for await (const file of copyFilesInParallel(
      filesToCopy,
      this.localPath,
      this.syncSubPath
    )) {
      copied++;
      lastCopied = file;
      copyStep.progress(copied / filesToCopy.length);
    }

    job.step("Committing local changes...");
    await this.syncRepo.stageAll();
    const status = await this.syncRepo.statusPorcelain();
    if (status) {
      await this.syncRepo.commit("Local changes");
    }
    this.workCommit = await this.syncRepo.revParse("HEAD");

    job.done(() => `${label()} created ${this.workBranch}`);
  }

  /**
   * Merge target branch into work branch.
   * After this, the work branch contains the merge result.
   * In conflict markers: $LOCAL (ours) = our code, $REMOTE (theirs) = upstream.
   */
  private async performMerge(): Promise<void> {
    const label = () => style.label("Merge:");
    using job = jobs.addJob(
      "merge",
      () => `${label()} merging target into work...`
    );

    job.step("Running git merge...");
    const mergeClean = await this.syncRepo.merge(this.targetMergeBranch, {
      strategy: "histogram",
    });
    if (!mergeClean) {
      // Merge may fail with conflicts, which is expected
      job.done({
        state: "warn",
        message: () => `${label()} completed with conflicts`,
      });
    } else {
      job.done(() => `${label()} completed successfully`);
    }
  }

  /**
   * Check for merge conflicts and attempt resolution via merge tool.
   * Sets this.mergeResult. If conflicts remain, pauses the sync.
   * @returns true if all conflicts resolved (or none), false if paused.
   */
  private async resolveConflictsOrPause(): Promise<boolean> {
    this.mergeResult = await this.syncRepo.getMergeResult();

    if (this.mergeResult.conflicts.length === 0) {
      return true;
    }

    // Save checkpoint and attempt resolution
    await this.saveSyncCheckpoint();

    await this.configureAiMergeTool();
    if (this.args.mergetool) {
      await this.runMergeTool();
    }

    this.mergeResult = await this.syncRepo.getMergeResult();

    // A checkpoint left in place is cleared by run() once the changes are
    // applied, so a failure while applying can still be resumed.
    return this.mergeResult.conflicts.length === 0;
  }

  /**
   * Commit the merge if there are staged changes and no conflicts.
   */
  private async commitMergeIfNeeded(): Promise<boolean> {
    const label = () => style.label("Commit merge:");
    using job = jobs.addJob("commit-merge", () => `${label()} checking...`);

    job.step("Checking for staged changes...");
    const status = await this.syncRepo.statusPorcelain();
    if (!status) {
      job.done(() => `${label()} nothing to commit`);
      return false;
    }

    job.step("Committing resolved merge...");
    const committed = await this.syncRepo.commitNoEdit();
    if (!committed) {
      job.done({ state: "failed", message: () => `${label()} commit failed` });
      return false;
    }

    job.done(() => `${label()} merge committed`);
    return true;
  }

  /**
   * Apply merged changes to local path.
   * Copies files from sync dir, deletes orphans, updates config, prints summary.
   */
  private async applyChanges(): Promise<void> {
    const label = () => style.label("Apply changes:");
    using job = jobs.addJob("apply-changes", () => `${label()} applying...`);

    // Ensure .syncignore is in the sync repo (needed for --continue mode)
    await this.copySyncIgnoreToSyncRepo();

    // Copy merged files to local path (hash-based delta)
    job.step("Computing file hashes...");
    const { localHashes, syncHashes } = await this.getFileHashMaps();
    const filesToCopy = await this.computeChangedPaths(
      syncHashes,
      localHashes,
      this.syncSubPath,
      this.localPath
    );

    let copied = 0;
    let lastCopied = "";
    const ttyText = `Copying ${filesToCopy.length} changed files...`;
    const copyStep = job.step(
      ttyOrLog(ttyText, () =>
        copied === 0 ? ttyText : `${copied}: ${lastCopied}`
      ),
      { progressBar: 0 }
    );
    for await (const file of copyFilesInParallel(
      filesToCopy,
      this.syncSubPath,
      this.localPath
    )) {
      copied++;
      lastCopied = file;
      copyStep.progress(copied / filesToCopy.length);
    }

    // Delete files removed upstream
    const filesToDelete = await this.computeFilesToDelete();

    if (filesToDelete.length > 0) {
      let deleted = 0;
      let lastDeleted = "";
      const ttyText = `Deleting ${filesToDelete.length} removed file(s)...`;
      const deleteStep = job.step(
        ttyOrLog(ttyText, () =>
          deleted === 0 ? ttyText : `${deleted}: ${lastDeleted}`
        ),
        { progressBar: 0 }
      );
      for (const file of filesToDelete) {
        const fullPath = path.join(this.localPath, file);
        try {
          await fs.unlink(fullPath);
          await removeEmptyParentDirs(fullPath, this.localPath);
        } catch {
          job.warn(`Failed to delete: ${file}`);
        }
        deleted++;
        lastDeleted = file;
        deleteStep.progress(deleted / filesToDelete.length);
      }
    }

    // Get actual change statistics from git status
    job.step("Computing change statistics...");
    const changes = await getChangeStats(this.mainRepo, this.depPathPrefix);
    this.changeStats = changes;

    this.submoduleReports = [];
    for (const sub of this.snapshotInfo?.submodules ?? []) {
      this.submoduleReports.push({
        path: sub.path,
        url: sub.url,
        baseUrl: sub.baseUrl,
        servedUrl: sub.servedUrl,
        baseSha: sub.baseSha,
        targetSha: sub.targetSha,
        changes: await getChangeStats(
          this.mainRepo,
          this.depPathPrefix ? `${this.depPathPrefix}/${sub.path}` : sub.path
        ),
      });
    }

    const newTag = this.targetTag ?? "";
    const totalChanges = changes.added + changes.modified + changes.deleted;

    // Skip writes when this sync was a true no-op: same commit, same tag, no
    // file deltas, and sync-config.json was already populated (first-ever
    // syncs always write so the file gets initialized).
    if (
      this.config.baseCommit &&
      this.targetCommit === this.config.baseCommit &&
      (this.config.tag ?? "") === newTag &&
      totalChanges === 0
    ) {
      this.noOpSync = true;
      job.done(
        () =>
          `${label()} no changes — sync-config.json and PR notes left untouched`
      );
      return;
    }

    // Update sync config
    job.step("Updating sync config...");
    await saveSyncConfig(this.localPath, {
      repo: this.config.repo,
      branch: this.args.branch ?? this.config.branch,
      commit: this.targetCommit,
      ...(this.config.subDir ? { subDir: this.config.subDir } : {}),
      ...(this.config.sparsePaths.length
        ? { sparsePaths: this.config.sparsePaths }
        : {}),
      ...(this.config.cloneFilter !== "blob:none"
        ? { cloneFilter: this.config.cloneFilter }
        : {}),
      ...(this.isSnapshot ? { fetchMode: this.config.fetchMode } : {}),
      ...(this.config.submodulesRaw
        ? { submodules: this.config.submodulesRaw }
        : {}),
      ...(this.config.keepLocalDeletions ? { keepLocalDeletions: true } : {}),
      tag: newTag,
      lastSync: new Date().toISOString(),
    });

    // Generate PR notes
    job.step("Generating PR notes...");
    const notes = await this.generatePRNotes();
    const notesPath = path.join(this.localPath, SYNC_PR_NOTES_FILE);
    await fs.writeFile(notesPath, notes, "utf-8");
    this.prNotes = notes;
    this.prNotesPath = notesPath;

    job.done(
      () =>
        `${label()} ${totalChanges} change(s) (${changes.added} Added, ${changes.modified} Modified, ${changes.deleted} Deleted)`
    );
  }

  // =============================================================================
  // PR notes generation
  // =============================================================================

  /**
   * Get upstream commits between base and target.
   * Parses `git log --format="%H%x09%an%x09%s"` output into structured data.
   */
  private async getUpstreamCommits(): Promise<UpstreamCommit[]> {
    // First sync has no base commit, so `base..target` is not a valid range.
    // Snapshot mode has no local history; the notes link to the range instead.
    if (this.isFirstSync || this.isSnapshot) return [];

    const range = `${this.config.baseCommit}..${this.targetCommit}`;
    const output = await this.syncRepo.log({
      format: "%H%x09%an%x09%s",
      range,
      path: this.config.subDir || undefined,
    });

    if (!output.trim()) return [];

    return output
      .trim()
      .split("\n")
      .map((line) => {
        const [hash, author, subject] = line.split("\t", 3);
        return {
          hash: hash ?? "",
          author: author ?? "",
          subject: subject ?? "",
        };
      })
      .filter((c) => c.hash);
  }

  /**
   * Generate markdown PR notes summarizing the sync.
   * Includes upstream commits, conflict resolution summary, and change stats.
   */
  private async generatePRNotes(): Promise<string> {
    const commits = await this.getUpstreamCommits();
    const shortBase = this.config.baseCommit.slice(0, 8);
    const shortTarget = this.targetCommit.slice(0, 8);
    const refName = this.targetTag || this.args.branch || this.config.branch;
    const repoUrl = this.config.repo.replace(/\.git$/, "");

    const lines: string[] = [];

    // Header
    lines.push(`## Upstream Sync: ${this.config.name}`);
    lines.push("");
    lines.push(
      `Syncing [${this.config.name}](${repoUrl}) from \`${shortBase}\` to \`${shortTarget}\` (${this.targetTag ? "tag" : "branch"}: \`${refName}\`).`
    );
    lines.push("");

    // Commit table (history mode) or a link to the upstream range (snapshot)
    if (this.isSnapshot) {
      lines.push("### Upstream Changes");
      lines.push("");
      const link = compareUrl(
        this.config.repo,
        this.config.baseCommit,
        this.targetCommit
      );
      if (this.isFirstSync) {
        lines.push("Initial import.");
      } else if (this.config.baseCommit === this.targetCommit) {
        lines.push("Same upstream commit.");
      } else {
        lines.push(
          link
            ? `[\`${shortBase}..${shortTarget}\`](${link})`
            : `\`${this.config.baseCommit}..${this.targetCommit}\``
        );
      }
    } else {
      lines.push(`### Upstream Commits (${commits.length})`);
      lines.push("");
      lines.push(...formatCommitTable(commits));
    }
    lines.push("");

    if (this.snapshotInfo) {
      lines.push(
        ...formatSubmoduleSection(
          this.submoduleReports,
          this.snapshotInfo.gitlinks,
          !this.isFirstSync
        )
      );
    }

    // Conflict resolution summary
    const { resolved, conflicts } = this.mergeResult;
    if (resolved.length > 0 || conflicts.length > 0) {
      lines.push("### Conflict Resolution");
      lines.push("");
      const total = resolved.length + conflicts.length;
      lines.push(`- ${total} file(s) had merge conflicts`);
      if (resolved.length > 0) {
        lines.push(`- ${resolved.length} resolved`);
      }
      if (conflicts.length > 0) {
        lines.push(`- ${conflicts.length} remaining (manual resolution)`);
      }
      lines.push("");
    }

    // Change stats
    const { modified, added, deleted } = this.changeStats;
    lines.push("### Files Changed");
    lines.push("");
    lines.push(`- ${modified} modified, ${added} added, ${deleted} deleted`);
    const pruned = this.snapshotInfo?.pruned;
    if (this.config.keepLocalDeletions && pruned && pruned.count > 0) {
      lines.push(
        `- ${pruned.count} locally removed file(s) kept out` +
          (pruned.changedUpstream > 0
            ? ` (${pruned.changedUpstream} changed or removed upstream)`
            : "")
      );
    }
    const frozen = this.snapshotInfo?.frozen ?? [];
    const newlyFollowed = this.snapshotInfo?.newlyFollowed ?? [];
    if (newlyFollowed.length > 0) {
      lines.push(
        `- Newly followed, imported in full: ${newlyFollowed.map((p) => `\`${p}\``).join(", ")}`
      );
    }
    if (frozen.length > 0) {
      lines.push(
        `- ⚠️ ${frozen.length} vendored file(s) excluded by .syncignore were not updated: ` +
          frozen
            .slice(0, 10)
            .map((f) => `\`${f}\``)
            .join(", ") +
          (frozen.length > 10 ? `, … and ${frozen.length - 10} more` : "")
      );
    }
    lines.push("");

    // Footer
    lines.push("---");
    lines.push(
      "*Generated by [fork-sync](https://github.com/microsoft/rnx-kit/tree/main/incubator/fork-sync)*"
    );
    lines.push("");

    return lines.join("\n");
  }

  // =============================================================================
  // Checkpoint management methods
  // =============================================================================

  /**
   * Get the path to the sync checkpoint file.
   */
  private getSyncCheckpointPath(): string {
    return path.join(
      this.config.manifestDir,
      SYNC_DIR,
      this.config.name,
      SYNC_CHECKPOINT_FILE
    );
  }

  /**
   * Read sync checkpoint from file and cache it.
   * Call this once at the start of run() to initialize the cache.
   */
  private async readSyncCheckpoint(): Promise<SyncCheckpoint | undefined> {
    try {
      const content = await fs.readFile(this.getSyncCheckpointPath(), "utf-8");
      this.syncCheckpoint = JSON.parse(content) as SyncCheckpoint;
    } catch {
      this.syncCheckpoint = undefined;
    }
    return this.syncCheckpoint;
  }

  /**
   * Apply saved checkpoint for --continue mode.
   * Validates that sync config hasn't changed since pause.
   */
  private async applySyncCheckpoint(): Promise<void> {
    const checkpoint = this.syncCheckpoint;
    if (!checkpoint) {
      return fatal(
        `No sync in progress for "${this.config.name}" to continue.`
      );
    }

    // Validate sync config hasn't changed since sync started
    if (this.config.repo !== checkpoint.upstream.repo) {
      return fatal(`Sync config repo changed since sync started.`);
    }
    if (this.config.branch !== checkpoint.upstream.branch) {
      return fatal(`Sync config branch changed since sync started.`);
    }
    if (this.config.baseCommit !== checkpoint.upstream.baseCommit) {
      return fatal(
        `Sync config commit changed - was another sync completed while this one was paused?`
      );
    }
    if (
      checkpoint.options !== undefined &&
      checkpoint.options !== this.optionsFingerprint()
    ) {
      return fatal(
        `Sync options (fetchMode, keepLocalDeletions, subDir, sparsePaths, or submodules) ` +
          `changed since the sync started. Restore them, or run --abort and start again.`
      );
    }
    if (this.config.keepLocalDeletions && !checkpoint.workCommit) {
      return fatal(
        `The paused sync was started by an older fork-sync and cannot be continued ` +
          `with keepLocalDeletions. Run --abort and start again.`
      );
    }

    this.targetCommit = checkpoint.upstream.targetCommit;
    this.targetBranch = checkpoint.upstream.branch;
    this.targetTag = checkpoint.upstream.tag ?? "";
    this.workBranch = checkpoint.mergeBranches.work;
    this.targetMergeBranch = checkpoint.mergeBranches.target;
    this.workCommit = checkpoint.workCommit ?? "";
    this.snapshotInfo = checkpoint.snapshot;
  }

  /**
   * Delete sync checkpoint file and clear cache.
   */
  private async clearSyncCheckpoint(): Promise<void> {
    await deleteFile(this.getSyncCheckpointPath());
    this.syncCheckpoint = undefined;
  }

  /** Options that must not change while a sync is paused. */
  private optionsFingerprint(): string {
    return JSON.stringify({
      fetchMode: this.config.fetchMode,
      keepLocalDeletions: this.config.keepLocalDeletions,
      subDir: this.config.subDir,
      sparsePaths: this.config.sparsePaths,
      submodules: this.config.submodules.map((s) => s.path),
    });
  }

  /**
   * Save sync checkpoint for later --continue.
   */
  private async saveSyncCheckpoint(): Promise<void> {
    const checkpoint: SyncCheckpoint = {
      dependency: this.config.name,
      manifestPath: this.config.manifestPath,
      upstream: {
        repo: this.config.repo,
        branch: this.targetBranch,
        targetCommit: this.targetCommit,
        baseCommit: this.config.baseCommit,
        tag: this.targetTag,
      },
      mergeBranches: {
        work: this.workBranch,
        target: this.targetMergeBranch,
      },
      ...(this.workCommit ? { workCommit: this.workCommit } : {}),
      ...(this.snapshotInfo ? { snapshot: this.snapshotInfo } : {}),
      options: this.optionsFingerprint(),
      startedAt: new Date().toISOString(),
    };

    const checkpointPath = this.getSyncCheckpointPath();
    await ensureDir(path.dirname(checkpointPath));
    await fs.writeFile(
      checkpointPath,
      JSON.stringify(checkpoint, null, 2),
      "utf-8"
    );
    this.syncCheckpoint = checkpoint;
  }

  // =============================================================================
  // Merge tool functions
  // =============================================================================

  /**
   * Run merge tool to resolve conflicts.
   * In 'ai' mode (default): invokes ai-merge --merge-all for parallel batch processing.
   * In 'git' mode: invokes git mergetool --no-prompt (sequential, per file).
   */
  private async runMergeTool(): Promise<void> {
    const mode = this.args.mergetool ?? "ai";

    if (mode === "git") {
      debug("Running git mergetool...");
      // Run git mergetool with all stdio inherited so child processes preserve TTY status.
      // Using ignoreExitCode since git mergetool may exit non-zero if some files weren't resolved.
      await this.syncRepo.mergetool({ noPrompt: true });
    } else {
      debug("Running ai-merge in batch mode...");
      const toolPath = normalizePath(path.resolve(SCRIPT_DIR, AI_MERGE_SCRIPT));
      const aiArgs = this.getAiMergeArgs();

      await spawn(
        "node",
        [toolPath, "--merge-all", "-C", this.syncPath, ...aiArgs],
        {
          mode: "passthrough",
          ignoreExitCode: true,
        }
      );
    }
  }

  /**
   * Configure ai-merge as the merge tool for the sync directory.
   * Sets up Git to use our AI-assisted merge tool for conflict resolution.
   */
  private async configureAiMergeTool(): Promise<void> {
    if (!this.config.aiMerge) return;

    // Detect and configure user's merge tool as fallback
    const fallback = await this.detectUserMergeTool();
    if (fallback) {
      await this.configureFallbackMergeTool(fallback);
    }

    // Convert to forward slashes for Git on Windows compatibility
    const toolPath = normalizePath(path.resolve(SCRIPT_DIR, AI_MERGE_SCRIPT));
    await this.syncRepo.configSet("merge.tool", "ai_merge");
    // Git will substitute $BASE, $LOCAL, $REMOTE, $MERGED with actual paths
    const aiArgs = this.getAiMergeArgs();
    const aiArgsStr = aiArgs.length > 0 ? ` ${aiArgs.join(" ")}` : "";
    const mergetoolCmd = `node "${toolPath}" --base "$BASE" --local "$LOCAL" --remote "$REMOTE" --merged "$MERGED"${aiArgsStr}`;
    await this.syncRepo.configSet("mergetool.ai_merge.cmd", mergetoolCmd);

    // Trust exit code (0 = success, non-zero = failure)
    await this.syncRepo.configSet("mergetool.ai_merge.trustExitCode", "true");

    // Don't prompt for each file
    await this.syncRepo.configSet("mergetool.prompt", "false");

    // Use diff3 conflict style for better context (shows base version)
    await this.syncRepo.configSet("merge.conflictStyle", "diff3");
  }

  /**
   * Detect the user's configured merge tool from git config.
   * Filters out ai_merge (our own tool) so we only get the user's real tool.
   */
  private async detectUserMergeTool(): Promise<MergeTool | null> {
    const tool = await this.mainRepo.getConfiguredMergeTool();
    if (!tool || tool.name === "ai_merge") {
      return null;
    }
    return tool;
  }

  /**
   * Configure the user's merge tool as fallback in the sync directory.
   */
  private async configureFallbackMergeTool(fallback: MergeTool): Promise<void> {
    debug(`Configuring fallback merge tool: ${fallback.name}`);
    await this.syncRepo.configSet("merge.fallbackTool", fallback.name);
    await this.syncRepo.setMergeTool(fallback);
  }

  /**
   * Build ai-merge CLI arguments from the sync config.
   */
  private getAiMergeArgs(): string[] {
    if (!this.config.aiMerge) return [];

    const result: string[] = [];

    if (this.config.aiMerge.provider) {
      result.push("--ai-provider", this.config.aiMerge.provider);
    }

    const models = parseModelList(this.config.aiMerge.model);
    if (models.length > 0) {
      result.push("--ai-model", models.join(","));
    }

    if (this.config.aiMerge.reasoningEffort) {
      result.push("--ai-reasoning-effort", this.config.aiMerge.reasoningEffort);
    }

    if (this.config.aiMerge.minConfidence) {
      result.push("--min-confidence", this.config.aiMerge.minConfidence);
    }

    return result;
  }

  // ===========================================================================
  // Copy file helper functions
  // ===========================================================================

  /**
   * Get file hash maps for both local and sync directories.
   * Used by createWorkBranch() and applyChanges() to compute file differences.
   */
  private async getFileHashMaps(): Promise<{
    localHashes: Map<string, string>;
    syncHashes: Map<string, string>;
  }> {
    const allowedLocal = new Set(
      await getAllowedRelativePaths(
        this.mainRepo,
        this.syncIgnorePath,
        this.depPathPrefix,
        this.depPathPrefix
      )
    );
    const allowedSync = new Set(
      await getAllowedRelativePaths(
        this.syncRepo,
        this.syncIgnorePath,
        this.subDirPrefix,
        this.syncPathspecs
      )
    );
    return {
      localHashes: await getGitTreeHashes(
        this.mainRepo,
        allowedLocal,
        this.depPathPrefix,
        this.depPathPrefix
      ),
      syncHashes: await getGitTreeHashes(
        this.syncRepo,
        allowedSync,
        this.subDirPrefix,
        this.syncPathspecs
      ),
    };
  }

  /**
   * Local files to delete after the merge.
   *
   * Default: local files (minus `.syncignore`) missing from the merged upstream
   * listing. With `keepLocalDeletions`: only files the merge itself deleted
   * (present in the work branch before the merge, gone after it), so local-only
   * files and pruned files are never touched.
   */
  private async computeFilesToDelete(): Promise<string[]> {
    const localFiles = await getAllowedRelativePaths(
      this.mainRepo,
      this.syncIgnorePath,
      this.depPathPrefix,
      this.depPathPrefix
    );

    if (this.config.keepLocalDeletions) {
      if (this.isFirstSync || !this.workCommit) return [];
      const prefix = this.subDirPrefix ? `${this.subDirPrefix}/` : "";
      const deleted = new Set<string>();
      for (const p of await this.syncRepo.deletedPaths(
        this.workCommit,
        "HEAD"
      )) {
        const normalized = normalizePath(p);
        if (!prefix) deleted.add(normalized);
        else if (normalized.startsWith(prefix)) {
          deleted.add(normalized.slice(prefix.length));
        }
      }
      return localFiles.filter((file) => deleted.has(file));
    }

    const allowedSync = new Set(
      await getAllowedRelativePaths(
        this.syncRepo,
        this.syncIgnorePath,
        this.subDirPrefix,
        this.syncPathspecs
      )
    );
    return localFiles.filter((file) => !allowedSync.has(file));
  }

  private async computeChangedPaths(
    source: Map<string, string>,
    target: Map<string, string>,
    sourceDir: string,
    targetDir: string
  ): Promise<string[]> {
    // First pass: fast comparison using git ls-tree blob hashes
    const candidates: string[] = [];
    for (const [filePath, hash] of source.entries()) {
      if (!target.has(filePath) || target.get(filePath) !== hash) {
        candidates.push(filePath);
      }
    }

    // Second pass: verify on-disk content (eliminates CRLF false positives)
    const changed: string[] = [];
    await Promise.all(
      candidates.map(async (relativePath) => {
        const sourceHash = await hashFileContent(
          path.join(sourceDir, relativePath)
        );
        const targetHash = await hashFileContent(
          path.join(targetDir, relativePath)
        );
        if (sourceHash !== targetHash) {
          changed.push(relativePath);
        }
      })
    );

    return changed;
  }
}

// =============================================================================
// SyncConfig loading, validation, and saving
// =============================================================================

/**
 * Discover and resolve the sync manifest file.
 * Search order:
 *   1. --manifest arg (resolved relative to cwd)
 *   2. Check cwd for sync-manifest.json
 *   3. Walk up parent directories until .git boundary or filesystem root
 */
async function discoverManifest(
  manifestArg: string | undefined,
  startDir: string
): Promise<{ manifestPath: string; manifestDir: string }> {
  if (manifestArg) {
    // Explicit --manifest is resolved relative to real cwd, not -C directory
    const resolved = path.isAbsolute(manifestArg)
      ? manifestArg
      : path.join(process.cwd(), manifestArg);

    if (!(await exists(resolved))) {
      return fatal(`Manifest not found: ${resolved}`);
    }

    return { manifestPath: resolved, manifestDir: path.dirname(resolved) };
  }

  // Search from startDir upward
  let dir = startDir;

  for (;;) {
    const candidate = path.join(dir, SYNC_MANIFEST_DEFAULT);
    if (await exists(candidate)) {
      return { manifestPath: candidate, manifestDir: dir };
    }

    // Stop at .git boundary
    if (await exists(path.join(dir, ".git"))) break;

    // Stop at filesystem root
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return fatal(
    `Manifest "${SYNC_MANIFEST_DEFAULT}" not found.\n` +
      `Searched from ${startDir} up to ${dir}.\n` +
      `Use --manifest to specify location.`
  );
}

/**
 * Validate that all dependency names in the manifest are unique.
 */
function validateUniqueDependencyNames(
  manifest: SyncManifest,
  manifestPath: string
): void {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const dep of manifest.dependencies) {
    if (seen.has(dep.name)) duplicates.push(dep.name);
    seen.add(dep.name);
  }
  if (duplicates.length > 0) {
    fatal(
      `Duplicate dependency names in ${manifestPath}: ${duplicates.join(", ")}\n` +
        `Each dependency name must be unique within a manifest.`
    );
  }
}

function getSyncConfigFilePath(localPath: string): string {
  return path.join(localPath, SYNC_CONFIG_FILE);
}

/**
 * Validate the manifest's `aiMerge` settings. They are written into the git
 * mergetool command line, so values are restricted to known words and model
 * IDs made of safe characters.
 */
function validateAiMergeConfig(
  aiMerge: AiMergeConfig | undefined,
  manifestPath: string
): void {
  if (aiMerge === undefined) return;
  const where = `in 'aiMerge' at ${manifestPath}`;
  if (aiMerge === null || typeof aiMerge !== "object") {
    fatal(`Invalid 'aiMerge' at ${manifestPath}: must be an object.`);
  }
  if (
    aiMerge.provider !== undefined &&
    aiMerge.provider !== "copilot" &&
    aiMerge.provider !== "claude"
  ) {
    fatal(`Invalid 'provider' ${where}: use "copilot" or "claude".`);
  }
  const model = aiMerge.model as unknown;
  const models =
    typeof model === "string"
      ? [model]
      : Array.isArray(model)
        ? (model as unknown[])
        : model === undefined
          ? []
          : null;
  if (
    models === null ||
    models.some((m) => typeof m !== "string" || !/^[\w.:/@[\]-]+$/.test(m))
  ) {
    fatal(
      `Invalid 'model' ${where}: use a model ID or a list of model IDs ` +
        `(letters, digits, and . _ - : / @ [ ] only).`
    );
  }
  if (
    aiMerge.reasoningEffort !== undefined &&
    aiMerge.reasoningEffort !== "default" &&
    !REASONING_EFFORT_LEVELS.includes(aiMerge.reasoningEffort)
  ) {
    fatal(
      `Invalid 'reasoningEffort' ${where}: use "default" or one of ${REASONING_EFFORT_LEVELS.join(", ")}.`
    );
  }
  if (
    aiMerge.minConfidence !== undefined &&
    !["HIGH", "MEDIUM", "LOW"].includes(aiMerge.minConfidence)
  ) {
    fatal(`Invalid 'minConfidence' ${where}: use HIGH, MEDIUM, or LOW.`);
  }
}

/**
 * Load and validate the fully resolved sync configuration.
 * Combines data from the manifest and sync-config.json into a single object.
 * Calls fatal() if any required file is missing or invalid.
 */
async function loadSyncConfig(
  manifestPath: string,
  manifestDir: string,
  depName: string
): Promise<SyncConfig> {
  // Load manifest
  let manifest: SyncManifest;
  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    manifest = JSON.parse(raw) as SyncManifest;
  } catch (e) {
    const err = e as { message?: string };
    return fatal(
      `Failed to load manifest from ${manifestPath}: ${err.message ?? "unknown error"}`
    );
  }

  // Validate uniqueness
  validateUniqueDependencyNames(manifest, manifestPath);
  validateAiMergeConfig(manifest.aiMerge, manifestPath);

  // Find dependency
  const dep = manifest.dependencies.find((d) => d.name === depName);
  if (!dep) {
    const available = manifest.dependencies.map((d) => d.name).join(", ");
    return fatal(
      `Dependency "${depName}" not found in manifest.\nAvailable: ${available}`
    );
  }

  // Load sync-config.json
  const resolvedLocalPath = path.join(manifestDir, dep.localPath);
  const configPath = getSyncConfigFilePath(resolvedLocalPath);

  if (!(await exists(configPath))) {
    return fatal(
      `Sync config not found at ${configPath}.\n` +
        `Please create this file with repo, branch, commit, tag, and lastSync fields.`
    );
  }

  const content = await fs.readFile(configPath, "utf-8");

  let configFile: SyncConfigFile;
  try {
    configFile = JSON.parse(content) as SyncConfigFile;
  } catch (err) {
    const detail = err instanceof SyntaxError ? err.message : String(err);
    return fatal(`Invalid JSON in sync config at ${configPath}.\n${detail}`);
  }

  if (!configFile.repo) {
    return fatal(
      `Missing 'repo' in ${configPath}. Please set the upstream repository URL.`
    );
  }

  if (!configFile.branch) {
    return fatal(
      `Missing 'branch' in ${configPath}. Please set the target branch name.`
    );
  }

  // 'commit' is intentionally optional: an empty/absent commit marks a first
  // sync (initial import of a dependency with no prior vendored content).

  if (configFile.subDir) {
    const normalized = normalizePath(configFile.subDir);
    if (normalized.startsWith("/") || normalized.includes("..")) {
      return fatal(
        `Invalid 'subDir' in ${configPath}: must be a relative path within the upstream repo (got "${configFile.subDir}").`
      );
    }
  }

  if (configFile.subDir && configFile.sparsePaths?.length) {
    return fatal(
      `Invalid sync config at ${configPath}: 'subDir' and 'sparsePaths' are mutually exclusive. ` +
        `Use 'subDir' for a single prefix-stripped subfolder, or 'sparsePaths' for multiple ` +
        `identity-mapped directories.`
    );
  }

  const sparsePaths: string[] = [];
  if (configFile.sparsePaths) {
    if (!Array.isArray(configFile.sparsePaths)) {
      return fatal(
        `Invalid 'sparsePaths' in ${configPath}: must be an array of relative paths.`
      );
    }
    for (const raw of configFile.sparsePaths) {
      const normalized = normalizePath(raw).replace(/\/+$/, "");
      if (
        !normalized ||
        normalized.startsWith("/") ||
        normalized.includes("..")
      ) {
        return fatal(
          `Invalid entry in 'sparsePaths' at ${configPath}: each must be a non-empty ` +
            `relative path within the upstream repo (got "${raw}").`
        );
      }
      sparsePaths.push(normalized);
    }
  }

  const fetchMode = configFile.fetchMode ?? "history";
  if (fetchMode !== "history" && fetchMode !== "snapshot") {
    return fatal(
      `Invalid 'fetchMode' in ${configPath}: must be "history" or "snapshot" (got "${String(configFile.fetchMode)}").`
    );
  }

  const submodules: SubmoduleSpec[] = [];
  if (configFile.submodules !== undefined) {
    const raw = configFile.submodules as unknown;
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return fatal(
        `Invalid 'submodules' in ${configPath}: must be an object mapping gitlink paths to options, ` +
          `e.g. { "third_party/foo/src": {} }.`
      );
    }
    for (const [key, options] of Object.entries(
      raw as Record<string, unknown>
    )) {
      const normalized = normalizePath(key).replace(/\/+$/, "");
      if (
        !normalized ||
        normalized.startsWith("/") ||
        normalized.split("/").includes("..")
      ) {
        return fatal(
          `Invalid submodule path in ${configPath}: must be a relative path within the upstream repo (got "${key}").`
        );
      }
      const opts = (options ?? {}) as { fallbackUrls?: unknown };
      if (typeof opts !== "object" || Array.isArray(opts)) {
        return fatal(
          `Invalid options for submodule "${key}" in ${configPath}: must be an object.`
        );
      }
      const fallbackUrls = opts.fallbackUrls ?? [];
      if (
        !Array.isArray(fallbackUrls) ||
        fallbackUrls.some((u) => typeof u !== "string" || !u)
      ) {
        return fatal(
          `Invalid 'fallbackUrls' for submodule "${key}" in ${configPath}: must be an array of URLs.`
        );
      }
      submodules.push({
        path: normalized,
        fallbackUrls: fallbackUrls as string[],
      });
    }
    for (const a of submodules) {
      for (const b of submodules) {
        if (a !== b && (a.path === b.path || b.path.startsWith(a.path + "/"))) {
          return fatal(
            `Invalid 'submodules' in ${configPath}: "${b.path}" overlaps "${a.path}".`
          );
        }
      }
    }
  }

  const keepLocalDeletions = configFile.keepLocalDeletions ?? false;
  if (typeof keepLocalDeletions !== "boolean") {
    return fatal(
      `Invalid 'keepLocalDeletions' in ${configPath}: must be true or false.`
    );
  }

  if (fetchMode !== "snapshot") {
    if (submodules.length > 0) {
      return fatal(
        `Invalid sync config at ${configPath}: 'submodules' requires "fetchMode": "snapshot".`
      );
    }
    if (keepLocalDeletions) {
      return fatal(
        `Invalid sync config at ${configPath}: 'keepLocalDeletions' requires "fetchMode": "snapshot".`
      );
    }
  }

  if (
    fetchMode === "snapshot" &&
    configFile.commit &&
    !/^[0-9a-f]{40}([0-9a-f]{24})?$/i.test(configFile.commit)
  ) {
    return fatal(
      `Invalid 'commit' in ${configPath}: snapshot mode needs a full commit SHA (got "${configFile.commit}").`
    );
  }

  if (configFile.subDir && submodules.length > 0) {
    return fatal(
      `Invalid sync config at ${configPath}: 'submodules' cannot be combined with 'subDir'. ` +
        `Use 'sparsePaths' (or the whole repo) instead.`
    );
  }

  // Return combined config
  return {
    // From manifest
    name: dep.name,
    localPath: dep.localPath,
    aiMerge: manifest.aiMerge,
    manifestPath,
    manifestDir,
    resolvedLocalPath,

    // From sync-config.json
    repo: configFile.repo,
    branch: configFile.branch,
    baseCommit:
      fetchMode === "snapshot"
        ? (configFile.commit ?? "").toLowerCase()
        : (configFile.commit ?? ""),
    tag: configFile.tag,
    lastSync: configFile.lastSync,
    subDir: configFile.subDir
      ? normalizePath(configFile.subDir).replace(/\/+$/, "")
      : "",
    sparsePaths,
    cloneFilter: configFile.cloneFilter?.trim() || "blob:none",
    fetchMode,
    submodules,
    submodulesRaw: configFile.submodules,
    keepLocalDeletions,
  };
}

/**
 * Save sync config to <localPath>/sync-config.json.
 * Only writes the file-specific fields, not the full resolved config.
 */
async function saveSyncConfig(
  localPath: string,
  config: SyncConfigFile
): Promise<void> {
  const configPath = getSyncConfigFilePath(localPath);
  await fs.writeFile(
    configPath,
    JSON.stringify(config, null, 2) + "\n",
    "utf-8"
  );
  debug(`Sync config updated: ${configPath}`);
}

// =============================================================================
// Clean Operation
// =============================================================================

async function cleanSyncDir(
  manifestDir: string,
  depName: string,
  yes: boolean
): Promise<void> {
  const label = () => style.label("Clean:");
  using job = jobs.addJob(
    "clean",
    () => `${label()} cleaning sync directory...`
  );

  const depSyncPath = path.join(manifestDir, SYNC_DIR, depName);

  if (!(await exists(depSyncPath))) {
    job.done(() => `${label()} no sync directory found for ${depName}`);
    return;
  }

  const confirmed = await confirm(`Delete ${depSyncPath}?`, { yes });
  if (!confirmed) {
    job.done(() => `${label()} aborted`);
    return;
  }

  job.step("Removing directory...");
  await removeDir(depSyncPath);
  job.done(() => `${label()} removed sync directory for ${depName}`);
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main(): Promise<void> {
  const args = parseCliArgs();

  // Resolve working directory (-C / --directory)
  const workingDirectory = args.directory
    ? path.resolve(args.directory)
    : process.cwd();
  if (args.directory && !(await exists(workingDirectory))) {
    return fatal(`Working directory not found: ${workingDirectory}`);
  }

  // Discover manifest and repo root
  const { manifestPath, manifestDir } = await discoverManifest(
    args.manifest,
    workingDirectory
  );
  const repoRoot = await discoverRepoRoot(workingDirectory);
  if (!repoRoot)
    return fatal("Not in a git repository. sync requires a git repository.");

  // Initialize logging (default: .sync/.logs/ relative to manifest)
  const defaultLogDir = path.join(manifestDir, SYNC_DIR, ".logs");
  initLogger({
    name: "sync",
    logDir: args["log-dir"] ?? defaultLogDir,
    logLevel: args["log-level"] as LogLevel,
  });

  proc.setLogger(logMessage);
  ui.setLogger(logMessage);
  jobs.setLogger(logMessage);

  const logFilePath = getLogFilePath();
  if (logFilePath) {
    info(() => `${style.label("Log file:")} ${logFilePath}`);
    info(() => `${style.label("Log level:")} ${getLogLevel()}`);
  } else {
    info(() => `${style.label("Log file:")} (disabled)`);
  }

  if (!args.dep) {
    return fatal("--dep is required. Use --help for usage.");
  }

  if (args.clean) {
    await cleanSyncDir(manifestDir, args.dep, args.yes ?? false);
  }

  // Exit if --no-sync (useful for clean-only mode)
  if (!args.sync) {
    return;
  }

  const syncConfig = await loadSyncConfig(manifestPath, manifestDir, args.dep);
  const session = new SyncSession(syncConfig, args, repoRoot);
  await session.run();
}

// Run
main().catch((e: unknown) => {
  const err = e as { message?: string };
  error(err.message || "Unknown error");
  exit(1);
});
