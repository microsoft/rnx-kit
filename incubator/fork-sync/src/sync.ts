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

import {
  copyFilesInParallel,
  deleteFile,
  ensureDir,
  exists,
  hashFileContent,
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
  normalizePath,
  validateCloneOrigin,
  type ChangeStats,
  type MergeResult,
  type MergeTool,
} from "./modules/git.ts";
import * as proc from "./modules/proc.ts";
const { spawn } = proc;

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

  return values;
}

// =============================================================================
// Type Definitions
// =============================================================================

export interface AiMergeConfig {
  provider: "copilot" | "claude";
  model?: string;
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
  commit: string; // Last synced upstream commit hash (empty string for first sync)
  tag: string; // Tag name if synced to a tag (empty string otherwise)
  lastSync: string; // ISO timestamp of last sync (empty string if never synced)
}

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
  baseCommit: string;
  tag: string;
  lastSync: string;
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

  // === Git repo wrapper for the sync directory ===
  readonly syncRepo: GitRepo;

  // === Mutable state (set during sync phases) ===
  targetCommit!: string;
  targetBranch!: string;
  targetTag?: string;
  workBranch!: string;
  targetMergeBranch!: string;
  syncCheckpoint?: SyncCheckpoint;
  mergeResult!: MergeResult;
  changeStats!: ChangeStats;

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
      this.generateBranchNames();
      await this.createTargetBranch();
      await this.createWorkBranch();
      await this.performMerge();
    } else {
      // === CONTINUE: validate existing checkpoint ===
      await this.applySyncCheckpoint();
      this.printHeader("resume");
    }

    if (!(await this.resolveConflictsOrPause())) {
      await this.printStatus();
      return;
    }

    await this.commitMergeIfNeeded();
    await this.applyChanges();
    this.printSummary();
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
${style.label("Work folder:")}  .sync/${this.config.name}/

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
    const refName = checkpoint.upstream.tag ?? checkpoint.upstream.branch;

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
    const refName = this.targetTag ?? this.targetBranch;

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

    const localPath = this.config.localPath;
    const changesSection = () =>
      totalChanges > 0
        ? `Changes to ${localPath}/:\n${changeLines().join("\n")}`
        : `No changes to ${localPath}/`;

    const resolvedSection = () =>
      this.mergeResult.resolved.length > 0
        ? `\n\n${style.success(`Resolved: ${this.mergeResult.resolved.length} merge conflict(s)`)}`
        : "";

    const footerMessage = () =>
      totalChanges > 0
        ? `Use ${style.command(`git diff ${localPath}/`)} to review changes.`
        : style.success("Already up to date.");

    print(
      () => `
${style.line()}
  ${style.heading("SYNC COMPLETE")}
${style.line()}

Upstream: ${this.config.repo}
  Commit: ${style.command(shortCommit)} (${refName})

${changesSection()}${resolvedSection()}

Merge branches preserved in .sync/${depName}/:
  - ${this.workBranch} (work branch — merge result)
  - ${this.targetMergeBranch} (target branch)

${style.line()}
${footerMessage()}
${style.line()}
`
    );
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
    const label = () => style.label("Upstream clone:");
    using job = jobs.addJob("upstream-clone", () => `${label()} setting up...`);

    job.step("Validating cached clone...");
    let repoExists = await isGitRepo(this.syncPath);
    const originValidation = repoExists
      ? await validateCloneOrigin(this.syncRepo, this.config.repo)
      : { valid: true, currentOrigin: undefined };

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
      job.done(() => `${label()} fetched latest from ${this.config.repo}`);
    } else {
      // Ensure URL ends with .git for cloning
      const cloneUrl = this.config.repo.endsWith(".git")
        ? this.config.repo
        : `${this.config.repo}.git`;

      await ensureDir(path.dirname(this.syncPath));
      // Clone without blobs to reduce initial download. Show progress via interactive mode.
      const cloneStep = job.step("Cloning repository...");
      for await (const chunk of clone(cloneUrl, this.syncPath, {
        filter: "blob:none",
        cwd: this.repoRoot,
      })) {
        cloneStep.update(chunk.text.trim());
      }
      job.done(() => `${label()} cloned ${this.config.repo}`);
    }
  }

  /**
   * Generate branch names for this sync session.
   */
  private generateBranchNames(): void {
    const syncId = getTimestampForFile();
    this.workBranch = `work_${syncId}`;
    this.targetMergeBranch = `target_${syncId}`;
    debug(`Work branch:   ${this.workBranch}`);
    debug(`Target branch: ${this.targetMergeBranch}`);
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
   * Resolve target commit from args (commit, tag, or branch).
   * Resolves the target commit hash from a direct commit, tag, or branch head.
   */
  private async resolveTarget(job: Job): Promise<void> {
    this.targetBranch = this.args.branch ?? this.config.branch;
    this.targetTag = this.args.tag;

    // If commit specified directly, use it
    if (this.args.commit) {
      job.step(
        `Using specified target commit: ${this.args.commit.slice(0, 8)}`
      );
      this.targetCommit = this.args.commit;
      return;
    }

    // If tag specified, resolve to commit using local refs
    if (this.args.tag) {
      job.step(`Resolving target tag ${this.args.tag}...`);
      // git rev-list -n 1 handles both lightweight and annotated tags
      const commit = await this.syncRepo.revList(`refs/tags/${this.args.tag}`, {
        count: 1,
      });
      if (!commit) {
        fatal(
          `Tag '${this.args.tag}' not found in local clone.\n` +
            `Try running: git fetch origin --tags (in ${this.syncPath})`
        );
      }
      job.step(`Tag ${this.args.tag} resolved to ${commit.slice(0, 8)}`);
      this.targetCommit = commit;
      return;
    }

    // Otherwise, get HEAD of branch from local refs
    job.step(`Resolving HEAD of branch ${this.targetBranch}...`);
    const commit = await this.syncRepo.revParse(`origin/${this.targetBranch}`);
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

  /**
   * Create work branch from base commit with local changes applied.
   * Checks out the base commit, creates a branch, copies local changes, and commits them.
   */
  private async createWorkBranch(): Promise<void> {
    const label = () => style.label("Work branch:");
    using job = jobs.addJob("work-branch", () => `${label()} creating...`);

    job.step(
      `Checking out base commit ${this.config.baseCommit.slice(0, 8)}...`
    );
    await this.syncRepo.checkout(this.config.baseCommit);

    job.step(`Creating branch ${this.workBranch}...`);
    await this.syncRepo.checkoutNewBranch(this.workBranch);

    job.step("Computing file differences...");
    const { localHashes, syncHashes } = await this.getFileHashMaps();
    const filesToCopy = await this.computeChangedPaths(
      localHashes,
      syncHashes,
      this.localPath,
      this.syncPath
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
      this.syncPath
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

    if (this.mergeResult.conflicts.length > 0) {
      return false;
    }

    // Conflicts resolved - clean up checkpoint
    await this.clearSyncCheckpoint();
    return true;
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

    // Copy merged files to local path (hash-based delta)
    job.step("Computing file hashes...");
    const { localHashes, syncHashes } = await this.getFileHashMaps();
    const filesToCopy = await this.computeChangedPaths(
      syncHashes,
      localHashes,
      this.syncPath,
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
      this.syncPath,
      this.localPath
    )) {
      copied++;
      lastCopied = file;
      copyStep.progress(copied / filesToCopy.length);
    }

    // Delete files removed upstream
    const allowedSync = new Set(
      await getAllowedRelativePaths(this.syncRepo, this.syncIgnorePath)
    );
    const localFiles = await getAllowedRelativePaths(
      this.mainRepo,
      this.syncIgnorePath,
      this.depPathPrefix
    );
    const filesToDelete = localFiles.filter((file) => !allowedSync.has(file));

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

    // Update sync config
    job.step("Updating sync config...");
    await saveSyncConfig(this.localPath, {
      repo: this.config.repo,
      branch: this.args.branch ?? this.config.branch,
      commit: this.targetCommit,
      tag: this.targetTag ?? "",
      lastSync: new Date().toISOString(),
    });

    this.changeStats = changes;

    const totalChanges = changes.added + changes.modified + changes.deleted;
    job.done(
      () =>
        `${label()} ${totalChanges} change(s) (${changes.added} Added, ${changes.modified} Modified, ${changes.deleted} Deleted)`
    );
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

    this.targetCommit = checkpoint.upstream.targetCommit;
    this.targetBranch = checkpoint.upstream.branch;
    this.targetTag = checkpoint.upstream.tag;
    this.workBranch = checkpoint.mergeBranches.work;
    this.targetMergeBranch = checkpoint.mergeBranches.target;
  }

  /**
   * Delete sync checkpoint file and clear cache.
   */
  private async clearSyncCheckpoint(): Promise<void> {
    await deleteFile(this.getSyncCheckpointPath());
    this.syncCheckpoint = undefined;
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

    if (this.config.aiMerge.model) {
      result.push("--ai-model", this.config.aiMerge.model);
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
        this.depPathPrefix
      )
    );
    const allowedSync = new Set(
      await getAllowedRelativePaths(this.syncRepo, this.syncIgnorePath)
    );
    return {
      localHashes: await getGitTreeHashes(
        this.mainRepo,
        allowedLocal,
        this.depPathPrefix,
        this.depPathPrefix
      ),
      syncHashes: await getGitTreeHashes(this.syncRepo, allowedSync),
    };
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

  if (!configFile.commit) {
    return fatal(
      `Missing 'commit' in ${configPath}. Please set the last synced upstream commit hash.`
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
    baseCommit: configFile.commit,
    tag: configFile.tag,
    lastSync: configFile.lastSync,
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
