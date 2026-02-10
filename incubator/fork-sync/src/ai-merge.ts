#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * AI-Assisted Merge Tool (ai-merge)
 *
 * A hunk-based merge tool that uses AI to resolve Git merge conflicts.
 *
 * ## Algorithm
 *
 * 1. Parse conflict markers from the merged file into individual hunks
 * 2. Coalesce adjacent hunks that are close together (within threshold)
 * 3. For each hunk:
 *    a. Extract hunk content with surrounding context lines
 *    b. Send to AI for resolution
 *    c. Validate AI's resolution (get confidence: HIGH/MEDIUM/LOW)
 *    d. If confidence >= minConfidence threshold: apply resolution
 *    e. If confidence < threshold: skip (leave conflict markers)
 * 4. Write result to merged file (may contain unresolved conflicts)
 * 5. If all hunks resolved: exit success
 * 6. If some unresolved: launch fallback merge tool for manual resolution
 *
 * ## Confidence Levels
 *
 * - HIGH: Resolution correctly merges both sides
 * - MEDIUM: Resolution seems reasonable but may have minor issues
 * - LOW: Resolution dropped changes or has significant problems
 *
 * Default threshold is MEDIUM (apply HIGH and MEDIUM, skip LOW).
 *
 * ## Usage
 *
 * node ai-merge.ts --base <base> --local <local> --remote <remote> --merged <merged> [options]
 *
 * Designed to integrate with Git's standard `mergetool` system.
 *
 * Git mergetool variables:
 *   $BASE   - Common ancestor version
 *   $LOCAL  - Current branch version (ours/HEAD)
 *   $REMOTE - Merging branch version (theirs)
 *   $MERGED - Output file (initially has conflict markers)
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";
import {
  detectLineEnding,
  exists,
  isBinaryContent,
  splitLines,
} from "./modules/fs.ts";
import { GitRepo } from "./modules/git.ts";
import * as proc from "./modules/proc.ts";
const { exec } = proc;

import {
  debug,
  error,
  info,
  initLogger,
  logMessage,
  VALID_LOG_LEVELS,
  validateLogLevel,
  warn,
  type LogLevel,
} from "./modules/log.ts";

// Import merge-hunks module
import {
  applyResolved,
  coalesceHunks,
  getHunkToMerge,
  getResolved,
  parseConflictedFile,
  type MergeInfo,
} from "./modules/merge-hunks.ts";

// Import claude module
import { invokeClaudeReadOnly } from "./modules/claude.ts";
import { invokeCopilotReadOnly } from "./modules/copilot.ts";
import * as JobProgress from "./modules/job-ui.ts";
import * as parallel from "./modules/parallel.ts";
import * as ui from "./modules/tty-ui.ts";
const { print, style, colors } = ui;

// Import prompt-template module
import {
  buildPrompt,
  collectSyncInstructions as collectSyncInstructionsFromModule,
  getFileTypeInfo as getFileTypeInfoFromTemplate,
  getSection,
  loadPromptTemplate,
  SECTION_HUNK_RESOLUTION,
  SECTION_HUNK_VALIDATION,
  type FileTypeInfo as FileTypeInfoFromModule,
  type PromptTemplate,
} from "./modules/ai-prompt-template.ts";

// =============================================================================
// Configuration
// =============================================================================

/** Number of context lines around each hunk */
const CONTEXT_LINES = 5;

/** Hunk coalescing threshold (must be < CONTEXT_LINES) */
const COALESCE_THRESHOLD = 3;

/** Script directory for temp files */
const SCRIPT_DIR = import.meta.dirname;

/** The script name relative to cwd for help messages */
const SCRIPT_NAME = path.relative(process.cwd(), import.meta.filename);

/** Default maximum retries per hunk */
const RETRY_LIMIT_DEFAULT = 2;

// =============================================================================
// Help Output
// =============================================================================

function printHelp(): void {
  console.log(`
${style.line()}
  ${style.heading("AI-ASSISTED MERGE TOOL")}
${style.line()}

${style.heading("Usage:")}
  ${style.command(`node ${SCRIPT_NAME}`)} ${style.command("--base")} <base> ${style.command("--local")} <local> ${style.command("--remote")} <remote> ${style.command("--merged")} <merged> [options]
  ${style.command(`node ${SCRIPT_NAME}`)} ${style.command("--merge-all")} [${style.command("-C")} <dir>] [options]

${style.heading("Single-File Mode (default):")}
  ${style.command("--base")}    <path>  Common ancestor version ($BASE)
  ${style.command("--local")}   <path>  Current branch version ($LOCAL / ours)
  ${style.command("--remote")}  <path>  Merging branch version ($REMOTE / theirs)
  ${style.command("--merged")}  <path>  Output file ($MERGED)

${style.heading("Batch Mode:")}
  ${style.command("--merge-all")}                  Discover and process ALL conflicted files in parallel
                               Mutually exclusive with --base/--local/--remote/--merged.
                               Discovers files via ${style.highlight("git diff --diff-filter=U")}.

${style.heading("Options:")}
  ${style.command("-C")}, ${style.command("--directory")} <path>       Working directory for git operations (default: cwd)
  ${style.command("--ai-provider")} <provider>     AI provider: ${style.highlight("claude")} (default) or ${style.highlight("copilot")}
  ${style.command("--ai-model")} <model>           Optional model name for provider
  ${style.command("--min-confidence")} <level>     Minimum confidence: ${style.highlight("HIGH")}, ${style.highlight("MEDIUM")}, ${style.highlight("LOW")}
                               Default: ${style.highlight("MEDIUM")} (apply HIGH and MEDIUM, skip LOW)
  ${style.command("--retry-limit")} <n>            Max retries per hunk (default: ${style.highlight(RETRY_LIMIT_DEFAULT.toString())})
  ${style.command("--concurrency")} <n>            Max parallel hunks (default: ${style.highlight("4")})
  ${style.command("--no-fallback")}                Skip fallback merge tool for unresolved files
                               Default: launch fallback for each unresolved file.
                               Use ${style.highlight("--no-fallback")} for CI/autonomous pipelines.
  ${style.command("--log-dir")} <path>             Log file directory (default: ${style.highlight(".logs/")})
  ${style.command("--log-level")} <level>          Log level: ${style.highlight(VALID_LOG_LEVELS.join(", "))}
  ${style.command("--clean-prompts")}              Delete .ai-merge-prompts/ after success
  ${style.command("--no-create-bak-file")}         Disable backup file creation
  ${style.command("--help")}                       Show this help message

${style.heading("Algorithm:")}
  1. Parse conflict markers into individual hunks
  2. Coalesce adjacent hunks (within threshold)
  3. For each hunk:
     - Send to AI for resolution
     - Validate resolution (confidence: HIGH/MEDIUM/LOW)
     - Apply if confidence >= threshold, else skip
  4. Write result (may contain unresolved conflicts)
  5. If conflicts remain, launch fallback merge tool

${style.heading("Git Integration:")}
  Configure in .git/config:

  ${colors.cyan("[merge]")}
      tool = ai_merge

  ${colors.cyan('[mergetool "ai_merge"]')}
      cmd = node "${path.resolve(SCRIPT_DIR, "ai-merge.ts")}" --base "$BASE" ...
      trustExitCode = true

${style.heading("Fallback Tool:")}
  When conflicts remain, ai-merge launches a fallback tool.
  Configure via:

  ${colors.cyan("[merge]")}
      fallbackTool = meld       ${colors.cyan("# Your preferred tool")}

${style.line()}
`);
}

// =============================================================================
// CLI Argument Parsing
// =============================================================================

async function parseCliArgs(): Promise<ParsedArgs> {
  const { values } = parseArgs({
    options: {
      base: { type: "string" },
      local: { type: "string" },
      remote: { type: "string" },
      merged: { type: "string" },
      "merge-all": { type: "boolean", default: false },
      fallback: { type: "boolean", default: true },
      directory: { type: "string", short: "C" },
      "ai-provider": { type: "string" },
      "ai-model": { type: "string" },
      "min-confidence": { type: "string" },
      "retry-limit": { type: "string", default: String(RETRY_LIMIT_DEFAULT) },
      concurrency: { type: "string", default: "4" },
      "log-dir": { type: "string" },
      "log-level": { type: "string", default: "default" },
      "clean-prompts": { type: "boolean", default: false },
      "create-bak-file": { type: "boolean", default: true },
      help: { type: "boolean", default: false, short: "h" },
    },
    strict: true,
    allowNegative: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const mergeAll = values["merge-all"] ?? false;

  if (!mergeAll) {
    // Single-file mode: require base/local/remote/merged
    const missingArgs = ["base", "local", "remote", "merged"].filter(
      (key) => !values[key as keyof typeof values]
    );
    if (missingArgs.length > 0) {
      error(
        `Missing required arguments: ${missingArgs.join(", ")}. Use --help for usage.`
      );
    }
  } else {
    // Batch mode: base/local/remote/merged must NOT be provided
    const providedArgs = ["base", "local", "remote", "merged"].filter(
      (key) => values[key as keyof typeof values]
    );
    if (providedArgs.length > 0) {
      error(
        `--merge-all is mutually exclusive with --base/--local/--remote/--merged. ` +
          `Found: ${providedArgs.join(", ")}`
      );
    }
  }

  const workingDirectory = path.resolve(values.directory ?? process.cwd());
  if (!(await exists(workingDirectory))) {
    error(`Working directory not found: ${workingDirectory}`);
  }

  const aiProvider = (values["ai-provider"] ?? "claude") as AiProvider;
  if (aiProvider !== "claude" && aiProvider !== "copilot") {
    error(`Provider '${aiProvider}' is not supported. Use claude or copilot.`);
  }

  const validConfidenceLevels: ConfidenceLevel[] = ["HIGH", "MEDIUM", "LOW"];
  const minConfidenceRaw = (values["min-confidence"]?.toUpperCase() ??
    "MEDIUM") as string;
  if (!validConfidenceLevels.includes(minConfidenceRaw as ConfidenceLevel)) {
    error(
      `Invalid --min-confidence value: ${values["min-confidence"]}. Use HIGH, MEDIUM, or LOW.`
    );
  }
  const minConfidence = minConfidenceRaw as ConfidenceLevel;

  const retryLimitArg = values["retry-limit"] ?? String(RETRY_LIMIT_DEFAULT);
  const retryLimit = parseInt(retryLimitArg, 10);
  if (isNaN(retryLimit) || retryLimit < 0) {
    error(
      `Invalid --retry-limit value: ${retryLimitArg}. Must be a non-negative integer.`
    );
  }

  const concurrencyArg = values.concurrency ?? "4";
  const concurrency = parseInt(concurrencyArg, 10);
  if (isNaN(concurrency) || concurrency <= 0) {
    error(
      `Invalid --concurrency value: ${concurrencyArg}. Must be a positive integer.`
    );
  }

  // Validate log level
  const logLevel = validateLogLevel(values["log-level"] as string);

  // Only validate input files in single-file mode
  if (!mergeAll) {
    const filesToCheck: [string, string][] = [
      ["base", values.base as string],
      ["local", values.local as string],
      ["remote", values.remote as string],
      ["merged", values.merged as string],
    ];

    const missingFiles: string[] = [];
    for (const [name, filePath] of filesToCheck) {
      if (!(await exists(filePath))) {
        missingFiles.push(`${name} file not found: ${filePath}`);
      }
    }
    if (missingFiles.length > 0) {
      error(missingFiles.join("\n"));
    }
  }

  return {
    base: (values.base as string) ?? "",
    local: (values.local as string) ?? "",
    remote: (values.remote as string) ?? "",
    merged: (values.merged as string) ?? "",
    directory: values.directory,
    workingDirectory,
    aiProvider,
    aiModel: values["ai-model"],
    minConfidence,
    retryLimit,
    concurrency,
    logDir: values["log-dir"],
    logLevel,
    cleanPrompts: values["clean-prompts"] ?? false,
    createBakFile: values["create-bak-file"] ?? true,
    mergeAll,
    fallback: values.fallback ?? true,
  };
}

// =============================================================================
// Types
// =============================================================================

/** Validation result with confidence level */
interface ValidationResult {
  confidence: ConfidenceLevel;
  issues: string[];
  notes: string;
}

/** Result of processing a single hunk */
interface HunkResult {
  index: number;
  confidence: ConfidenceLevel;
  applied: boolean;
  error?: string;
}

/** Result of processing all hunks */
interface ProcessHunksResult {
  /** File content after applying resolved hunks (may still have conflicts) */
  content: string;
  /** Number of hunks that were successfully resolved and applied */
  appliedCount: number;
  /** Number of hunks that were skipped (confidence below threshold) */
  skippedCount: number;
  /** Number of hunks that failed (error during resolution) */
  failedCount: number;
  /** Per-hunk results */
  hunkResults: HunkResult[];
  /** True if all hunks were applied (no skipped, no failed) */
  allResolved: boolean;
}

/** Confidence level type */
type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

/** Confidence levels in order from lowest to highest */
const CONFIDENCE_ORDER: Record<ConfidenceLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

/** Parsed and validated CLI arguments */
type AiProvider = "claude" | "copilot";

interface ParsedArgs {
  base: string;
  local: string;
  remote: string;
  merged: string;
  directory?: string;
  workingDirectory: string;
  aiProvider: AiProvider;
  aiModel?: string;
  minConfidence: ConfidenceLevel;
  retryLimit: number;
  concurrency: number;
  logDir?: string;
  logLevel: LogLevel;
  cleanPrompts: boolean;
  createBakFile: boolean;
  /** Batch mode: discover and process all conflicted files in parallel */
  mergeAll: boolean;
  /** Whether to launch fallback merge tool for unresolved files (default: true) */
  fallback: boolean;
}

/** Context for a single file being merged in batch mode */
interface FileContext {
  /** Absolute path to the merged file */
  filePath: string;
  /** Relative path for display in prompts */
  relativePath: string;
  /** Parsed and coalesced conflict information */
  mergeInfo: MergeInfo;
  /** Line ending style (CRLF vs LF) */
  lineEnding: string;
  /** File type guidance from prompt template */
  fileTypeInfo: FileTypeInfoFromModule;
  /** Sync instructions collected from hierarchy */
  syncInstructions: string;
}

/** Result of processing a single file in batch mode */
interface FileResult {
  filePath: string;
  relativePath: string;
  appliedCount: number;
  skippedCount: number;
  failedCount: number;
  totalHunks: number;
  allResolved: boolean;
  content: string;
}

/** Work item for the flat parallel pool in batch mode */
interface WorkItem {
  fileIndex: number;
  hunkIndex: number;
}

/** Options for creating a FileProcessor */
interface FileProcessorOptions {
  mergeInfo: MergeInfo;
  fileTypeInfo: FileTypeInfoFromModule;
  syncInstructions: string;
  minConfidence: ConfidenceLevel;
  filePath: string;
  retryLimit: number;
  provider: AiProvider;
}

// =============================================================================
// Global variables
// =============================================================================

/** Prompt template (loaded once) */
let promptTemplate: PromptTemplate | null = null;

/** Parsed CLI args (initialized in main) */
let args!: ParsedArgs;

// =============================================================================
// Utility Functions
// =============================================================================

function quoteForCommand(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

/**
 * Get a safe filename from a file path by replacing separators with underscores.
 * Used for both prompt and response file naming.
 */
function getSafeName(filePath: string): string {
  const relativePath = path.relative(args.workingDirectory, filePath);
  return relativePath.replace(/[\\/:/]/g, "_");
}

/**
 * Get a unique prompt filename based on relative file path.
 * Replaces path separators with underscores to avoid subdirectory creation.
 */
function getPromptFileName(
  filePath: string,
  hunkIndex: number,
  promptType: "merge" | "validation"
): string {
  const safeName = getSafeName(filePath);
  // Use 1-based index for human readability
  return `${safeName}.hunk-${hunkIndex + 1}.${promptType}-prompt.md`;
}

/**
 * Save a prompt to the prompts folder.
 * Creates .ai-merge-prompts/ in working directory if needed.
 * Returns the absolute path to the saved prompt file.
 */
async function savePrompt(
  filePath: string,
  hunkIndex: number,
  promptType: "merge" | "validation",
  content: string
): Promise<string> {
  const promptDir = path.join(args.workingDirectory, ".ai-merge-prompts");
  await fs.mkdir(promptDir, { recursive: true });

  const promptFileName = getPromptFileName(filePath, hunkIndex, promptType);
  const promptFilePath = path.join(promptDir, promptFileName);
  await fs.writeFile(promptFilePath, content, "utf-8");

  debug(`Saved ${promptType} prompt to ${promptFilePath}`);

  return promptFilePath;
}

/**
 * Save an AI response to the prompts folder for debugging.
 * Creates .ai-merge-prompts/ in working directory if needed.
 * Returns the absolute path to the saved response file.
 *
 * @param attempt - 0-based attempt number (displayed as 1-based in filename)
 */
async function saveResponse(
  filePath: string,
  hunkIndex: number,
  promptType: "merge" | "validation",
  attempt: number,
  content: string
): Promise<string> {
  const promptDir = path.join(args.workingDirectory, ".ai-merge-prompts");
  await fs.mkdir(promptDir, { recursive: true });

  const safeName = getSafeName(filePath);
  const responseFileName = `${safeName}.hunk-${hunkIndex + 1}.${promptType}-response.${attempt + 1}.md`;
  const responseFilePath = path.join(promptDir, responseFileName);
  await fs.writeFile(responseFilePath, content, "utf-8");

  debug(
    `Saved ${promptType} response (attempt ${attempt + 1}) to ${responseFilePath}`
  );

  return responseFilePath;
}

// =============================================================================
// Fallback Merge Tool Integration
// =============================================================================

/**
 * Resolve fallback merge tool from git config (set by sync.ts).
 */
async function resolveFallbackMergeTool(): Promise<{
  name: string | null;
  cmd: string | null;
}> {
  const repo = new GitRepo(args.workingDirectory);
  const name = await repo.configGet("merge.fallbackTool");
  if (!name) return { name: null, cmd: null };
  const cmd = await repo.configGet(`mergetool.${name}.cmd`);
  return { name, cmd };
}

/**
 * Apply merge tool arguments to the command.
 */
function applyMergeToolArgs(
  cmd: string,
  base: string,
  local: string,
  remote: string,
  merged: string
): string {
  let replaced = false;
  let result = cmd;

  const replacements: Record<string, string> = {
    $BASE: quoteForCommand(base),
    $LOCAL: quoteForCommand(local),
    $REMOTE: quoteForCommand(remote),
    $MERGED: quoteForCommand(merged),
  };

  for (const [token, value] of Object.entries(replacements)) {
    if (result.includes(token)) {
      result = result.split(token).join(value);
      replaced = true;
    }
  }

  if (!replaced) {
    result = `${result} ${quoteForCommand(base)} ${quoteForCommand(local)} ${quoteForCommand(remote)} -o ${quoteForCommand(merged)}`;
  }

  return result;
}

/**
 * Launch fallback merge tool for manual resolution.
 * Returns true if successful, false if no fallback tool configured or launch failed.
 */
async function launchFallbackMergeTool(
  base: string,
  local: string,
  remote: string,
  merged: string
): Promise<boolean> {
  const { name, cmd } = await resolveFallbackMergeTool();

  if (!cmd) {
    warn(
      "No fallback merge tool configured. Exiting with unresolved conflicts."
    );
    return false;
  }

  info(`Launching fallback merge tool: ${name}...`);
  const command = applyMergeToolArgs(cmd, base, local, remote, merged);

  // The command is a shell command string, so we use exec (which runs through shell).
  // Using passthrough so child processes inherit TTY status for progress UI.
  // Using ignoreExitCode since merge tools may exit non-zero for various reasons.
  await exec(command, { mode: "passthrough", ignoreExitCode: true });
  return true;
}

// =============================================================================
// Hunk-Based Processing
// =============================================================================

/**
 * Check if a confidence level meets the minimum threshold.
 */
function meetsConfidenceThreshold(
  confidence: ConfidenceLevel,
  minConfidence: ConfidenceLevel
): boolean {
  return CONFIDENCE_ORDER[confidence] >= CONFIDENCE_ORDER[minConfidence];
}

/**
 * Load the prompt template (cached).
 */
async function getPromptTemplate(): Promise<PromptTemplate> {
  if (promptTemplate) return promptTemplate;

  const result = await loadPromptTemplate(
    path.join(SCRIPT_DIR, "..", "ai-merge-prompt.md")
  );
  if (!result.success) {
    throw new Error(`Failed to load prompt template: ${result.error}`);
  }
  promptTemplate = result.template;
  return promptTemplate;
}

/**
 * Parse AI response to extract resolved hunk lines.
 * Requires <RESOLVED>...</RESOLVED> tags in the response.
 */
function parseResolvedHunk(response: string): string[] {
  // Look for <RESOLVED>...</RESOLVED> markers (required)
  const resolvedMatch = response.match(/<RESOLVED>\n?([\s\S]*?)<\/RESOLVED>/);
  if (!resolvedMatch) {
    throw new Error("Response missing required <RESOLVED>...</RESOLVED> tags");
  }

  // Remove trailing empty lines (from newline before closing tag)
  const lines = splitLines(resolvedMatch[1]);
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

/**
 * Parse validation response to extract confidence level.
 */
function parseValidationResponse(response: string): ValidationResult {
  const result: ValidationResult = { confidence: "LOW", issues: [], notes: "" };

  const confidenceMatch = response.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i);
  if (confidenceMatch) {
    result.confidence = confidenceMatch[1].toUpperCase() as
      | "HIGH"
      | "MEDIUM"
      | "LOW";
  }

  const issuesMatch = response.match(/ISSUES:\s*([^\n]+)/i);
  if (issuesMatch) {
    const issuesText = issuesMatch[1].trim();
    if (issuesText.toLowerCase() !== "none") {
      result.issues = issuesText
        .split(/[;,]/)
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
  }

  const notesMatch = response.match(/NOTES:\s*([^\n]+)/i);
  if (notesMatch) {
    result.notes = notesMatch[1].trim();
  }

  return result;
}

async function invokeProvider(
  promptFile: string,
  provider: AiProvider,
  timeout: number,
  model?: string
) {
  if (provider === "claude") {
    return invokeClaudeReadOnly({
      promptFile,
      cwd: args.workingDirectory,
      verbose: args.logLevel === "debug",
      timeout,
      model,
    });
  }

  return invokeCopilotReadOnly({
    promptFile,
    cwd: args.workingDirectory,
    verbose: args.logLevel === "debug",
    timeout,
    model,
  });
}

/**
 * Parse a file for merge conflicts.
 * Reads the file, detects binary content, parses conflict markers, coalesces hunks,
 * and loads file type info and sync instructions.
 */
async function parseFileForMerge(
  filePath: string,
  workingDirectory: string
): Promise<
  { success: true; context: FileContext } | { success: false; error: string }
> {
  const content = await fs.readFile(filePath, "utf-8");

  if (isBinaryContent(content)) {
    return { success: false, error: "Binary file detected" };
  }

  const lineEnding = detectLineEnding(content);
  const lines = splitLines(content);

  const parseResult = parseConflictedFile(lines);
  if (!parseResult.success) {
    return {
      success: false,
      error: `Failed to parse conflicts: ${parseResult.error}`,
    };
  }

  const mergeInfo = parseResult.info;
  const originalHunkCount = mergeInfo.hunks.length;
  mergeInfo.hunks = coalesceHunks(mergeInfo.hunks, COALESCE_THRESHOLD);
  info(
    `${path.basename(filePath)}: ${originalHunkCount} conflict(s), coalesced to ${mergeInfo.hunks.length} hunk(s)`
  );

  const template = await getPromptTemplate();
  const fileTypeInfo = getFileTypeInfoFromTemplate(template, filePath);
  const syncResult = await collectSyncInstructionsFromModule(
    filePath,
    workingDirectory
  );
  const syncInstructions =
    syncResult.combined.length > 0
      ? `## Sync Instructions:\n\n${syncResult.combined}`
      : "";

  const relativePath = path.relative(workingDirectory, filePath);

  return {
    success: true,
    context: {
      filePath,
      relativePath,
      mergeInfo,
      lineEnding,
      fileTypeInfo,
      syncInstructions,
    },
  };
}

// =============================================================================
// FileProcessor — per-file AI merge processing
// =============================================================================

/**
 * Per-file merge processor. Holds shared state for a single file's merge
 * operation and provides methods to resolve hunks via AI.
 */
class FileProcessor {
  readonly mergeInfo: MergeInfo;
  readonly fileTypeInfo: FileTypeInfoFromModule;
  readonly syncInstructions: string;
  readonly minConfidence: ConfidenceLevel;
  readonly filePath: string;
  readonly retryLimit: number;
  readonly provider: AiProvider;

  constructor(opts: FileProcessorOptions) {
    this.mergeInfo = opts.mergeInfo;
    this.fileTypeInfo = opts.fileTypeInfo;
    this.syncInstructions = opts.syncInstructions;
    this.minConfidence = opts.minConfidence;
    this.filePath = opts.filePath;
    this.retryLimit = opts.retryLimit;
    this.provider = opts.provider;
  }

  get totalHunks(): number {
    return this.mergeInfo.hunks.length;
  }

  /** Get resolved content after processing. */
  getResolvedContent(lineEnding: string): {
    content: string;
    hasConflictMarkers: boolean;
  } {
    const resolved = getResolved(this.mergeInfo);
    return {
      content: resolved.lines.join(lineEnding),
      hasConflictMarkers: resolved.hasConflictMarkers,
    };
  }

  /**
   * Process all hunks in parallel. Creates its own job hierarchy.
   * Used by single-file mode.
   */
  async processAllHunks(
    lineEnding: string,
    concurrency: number
  ): Promise<ProcessHunksResult> {
    const hunkResults: HunkResult[] = new Array(this.totalHunks);
    let appliedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const safeName = getSafeName(this.filePath);
    const fileTaskId = `merge:${safeName}`;

    using fileJob = JobProgress.addJob(
      fileTaskId,
      `Resolve ${path.basename(this.filePath)} (${this.totalHunks} hunks)`
    );

    fileJob.update({ message: "starting..." });

    const hunkIndices = Array.from({ length: this.totalHunks }, (_, i) => i);

    for await (const result of parallel.map(
      hunkIndices,
      async (i) => {
        const hunkTaskId = `${fileTaskId}:hunk-${i}`;
        using hunkJob = fileJob.addChildJob(
          hunkTaskId,
          `Hunk ${i + 1}/${this.totalHunks}`
        );

        return this.processHunk(i, hunkJob);
      },
      { concurrency }
    )) {
      hunkResults[result.index] = result;
      if (result.applied) {
        appliedCount++;
      } else if (result.error) {
        failedCount++;
      } else {
        skippedCount++;
      }
    }

    fileJob.update({ message: "complete" });
    fileJob.done();

    const resolved = this.getResolvedContent(lineEnding);

    return {
      content: resolved.content,
      appliedCount,
      skippedCount,
      failedCount,
      hunkResults,
      allResolved:
        skippedCount === 0 && failedCount === 0 && !resolved.hasConflictMarkers,
    };
  }

  /**
   * Process a single hunk: resolve with AI, validate, and apply if confidence is sufficient.
   * Retries up to retryLimit times on low confidence or context mismatch.
   * Used by batch mode (flat parallel pool).
   */
  async processHunk(
    hunkIndex: number,
    hunkJob: JobProgress.Job
  ): Promise<HunkResult> {
    hunkJob.update({ message: "resolving..." });

    const hunkContent = getHunkToMerge(
      this.mergeInfo,
      hunkIndex,
      CONTEXT_LINES
    );
    const hunk = this.mergeInfo.hunks[hunkIndex];
    const lineStart = hunk.mergedSpan.start + 1;
    const lineEnd = hunk.mergedSpan.start + hunk.mergedSpan.count;

    let lastError: string | undefined;
    let lastConfidence: ConfidenceLevel = "LOW";
    const maxAttempts = this.retryLimit + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        hunkJob.update({ message: `retry ${attempt + 1}/${maxAttempts}...` });
      }

      try {
        hunkJob.update({
          message:
            attempt > 0 ? `retry ${attempt + 1}: resolving...` : "resolving...",
        });
        const resolvedLines = await this.resolveHunk(
          hunkContent,
          hunkIndex,
          lineStart,
          lineEnd
        );

        hunkJob.update({
          message:
            attempt > 0
              ? `retry ${attempt + 1}: validating...`
              : "validating...",
        });
        const validation = await this.validateResolution(
          hunkContent,
          resolvedLines,
          hunkIndex,
          lineStart,
          lineEnd
        );

        if (validation.notes) hunkJob.info(`Notes: ${validation.notes}`);
        if (validation.issues.length > 0)
          hunkJob.info(`Issues: ${validation.issues.join("; ")}`);

        lastConfidence = validation.confidence;

        if (
          !meetsConfidenceThreshold(validation.confidence, this.minConfidence)
        ) {
          lastError = `${validation.confidence} < ${this.minConfidence}`;
          continue;
        }

        hunkJob.update({ message: "applying..." });
        const applyResult = applyResolved(
          this.mergeInfo,
          hunkIndex,
          CONTEXT_LINES,
          resolvedLines
        );
        if (!applyResult.success) {
          lastError = applyResult.error;
          hunkJob.info(`Context mismatch - ${applyResult.error}`);
          continue;
        }

        hunkJob.info(`Applied (${validation.confidence})`);
        hunkJob.done();
        return {
          index: hunkIndex,
          confidence: validation.confidence,
          applied: true,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        lastError = message;
        hunkJob.warn(`Error on attempt ${attempt + 1} - ${message}`);
      }
    }

    // All attempts exhausted
    const isLowConfidence =
      lastError?.includes("<") && lastError?.includes(this.minConfidence);
    if (isLowConfidence) {
      hunkJob.warn(`Skipped: ${lastConfidence} < ${this.minConfidence}`);
      hunkJob.done();
      return { index: hunkIndex, confidence: lastConfidence, applied: false };
    }

    hunkJob.warn(`Failed: ${lastError}`);
    hunkJob.done();
    return {
      index: hunkIndex,
      confidence: lastConfidence,
      applied: false,
      error: lastError,
    };
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  private async resolveHunk(
    hunkContent: string[],
    hunkIndex: number,
    lineStart: number,
    lineEnd: number
  ): Promise<string[]> {
    const prompt = await this.buildResolutionPrompt(
      hunkContent,
      hunkIndex,
      lineStart,
      lineEnd
    );

    const promptFile = await savePrompt(
      this.filePath,
      hunkIndex,
      "merge",
      prompt
    );

    const result = await invokeProvider(
      promptFile,
      this.provider,
      120000,
      args.aiModel
    );

    await saveResponse(
      this.filePath,
      hunkIndex,
      "merge",
      0,
      result.result || result.error || "(empty)"
    );

    if (!result.success) {
      throw new Error(
        `${this.provider} failed to resolve hunk ${hunkIndex + 1}: ${result.error}`
      );
    }

    return parseResolvedHunk(result.result);
  }

  private async buildResolutionPrompt(
    hunkContent: string[],
    hunkIndex: number,
    lineStart: number,
    lineEnd: number
  ): Promise<string> {
    const template = await getPromptTemplate();
    const hunkSection = getSection(template, SECTION_HUNK_RESOLUTION);
    if (!hunkSection) {
      throw new Error("hunk-resolution-prompt section not found in template");
    }

    return buildPrompt(hunkSection, {
      HUNK_CONTENT: hunkContent.join("\n"),
      HUNK_INDEX: String(hunkIndex + 1),
      TOTAL_HUNKS: String(this.totalHunks),
      FILE_TYPE_GUIDANCE: this.fileTypeInfo.guidance,
      FILE_TYPE_RULES: this.fileTypeInfo.rules,
      SYNC_INSTRUCTIONS: this.syncInstructions,
      FILE_PATH: this.filePath,
      LINE_START: String(lineStart),
      LINE_END: String(lineEnd),
    });
  }

  private async validateResolution(
    originalHunk: string[],
    resolvedLines: string[],
    hunkIndex: number,
    lineStart: number,
    lineEnd: number
  ): Promise<ValidationResult> {
    const template = await getPromptTemplate();
    const validationSection = getSection(template, SECTION_HUNK_VALIDATION);

    if (!validationSection) {
      return {
        confidence: "HIGH",
        issues: [],
        notes: "Validation skipped (no template)",
      };
    }

    const prompt = buildPrompt(validationSection, {
      ORIGINAL_HUNK: originalHunk.join("\n"),
      RESOLVED_CONTENT: resolvedLines.join("\n"),
      HUNK_INDEX: String(hunkIndex + 1),
      TOTAL_HUNKS: String(this.totalHunks),
      FILE_TYPE_GUIDANCE: this.fileTypeInfo.guidance,
      FILE_PATH: this.filePath,
      LINE_START: String(lineStart),
      LINE_END: String(lineEnd),
    });

    const promptFile = await savePrompt(
      this.filePath,
      hunkIndex,
      "validation",
      prompt
    );

    const result = await invokeProvider(
      promptFile,
      this.provider,
      60000,
      args.aiModel
    );

    await saveResponse(
      this.filePath,
      hunkIndex,
      "validation",
      0,
      result.result || result.error || "(empty)"
    );

    if (!result.success) {
      return {
        confidence: "LOW",
        issues: ["Validation failed"],
        notes: result.error ?? "",
      };
    }

    return parseValidationResponse(result.result);
  }
}

// =============================================================================
// Batch Mode (--merge-all)
// =============================================================================

/**
 * Discover all conflicted (unmerged) files in the working directory.
 */
async function discoverConflictedFiles(cwd: string): Promise<string[]> {
  const repo = new GitRepo(cwd);
  const files = await repo.diffNameOnly({ diffFilter: "U" });
  return files.map((f) => path.resolve(cwd, f));
}

/**
 * Extract BASE/LOCAL/REMOTE from git index stages to temp files for fallback tool.
 * Stage 1 = BASE, Stage 2 = LOCAL (ours), Stage 3 = REMOTE (theirs).
 */
async function extractStagesForFallback(
  cwd: string,
  relPath: string,
  tempDir: string
): Promise<{ base: string; local: string; remote: string }> {
  const repo = new GitRepo(cwd);
  const safeName = relPath.replace(/[\\/:/]/g, "_");
  const ext = path.extname(relPath);

  const stages = [
    { stage: "1", label: "BASE" },
    { stage: "2", label: "LOCAL" },
    { stage: "3", label: "REMOTE" },
  ] as const;

  const paths: Record<string, string> = {};

  for (const { stage, label } of stages) {
    const tempFile = path.join(tempDir, `${safeName}.${label}${ext}`);
    const content = await repo.show(`:${stage}:${relPath}`);
    await fs.writeFile(tempFile, content, "utf-8");
    paths[label] = tempFile;
  }

  return { base: paths.BASE, local: paths.LOCAL, remote: paths.REMOTE };
}

/**
 * Batch mode: discover all conflicted files, process all hunks across all files
 * in a single flat parallel pool, write results, and stage resolved files.
 */
async function mainBatch(): Promise<void> {
  const cwd = args.workingDirectory;

  // Step 1: Discover conflicted files
  const conflictedFiles = await discoverConflictedFiles(cwd);

  if (conflictedFiles.length === 0) {
    info("No conflicted files found.");
    process.exit(0);
  }

  // Print processing header
  print(
    () => `
${style.line()}
  ${style.heading("AI MERGE — BATCH MODE")}
${style.line()}
${style.label("Files:")}       ${style.command(conflictedFiles.length.toString())}
${style.label("Provider:")}    ${args.aiProvider}
${style.label("Confidence:")}  ${args.minConfidence}
${style.label("Concurrency:")} ${args.concurrency}
${style.label("Fallback:")}    ${args.fallback ? "enabled" : "disabled"}
`
  );

  // Step 2: Parse all files and collect FileContexts
  const fileContexts: FileContext[] = [];
  const skippedFiles: { filePath: string; reason: string }[] = [];

  for (const filePath of conflictedFiles) {
    const result = await parseFileForMerge(filePath, cwd);
    if (result.success) {
      fileContexts.push(result.context);
    } else {
      skippedFiles.push({ filePath, reason: result.error });
      warn(`Skipping ${path.relative(cwd, filePath)}: ${result.error}`);
    }
  }

  if (fileContexts.length === 0) {
    warn("No parseable conflicted files found.");
    process.exit(1);
  }

  // Step 3: Create processors and collect work items (flat pool across all files)
  const processors = fileContexts.map(
    (ctx) =>
      new FileProcessor({
        mergeInfo: ctx.mergeInfo,
        fileTypeInfo: ctx.fileTypeInfo,
        syncInstructions: ctx.syncInstructions,
        minConfidence: args.minConfidence,
        filePath: ctx.relativePath,
        retryLimit: args.retryLimit,
        provider: args.aiProvider,
      })
  );

  const workItems: WorkItem[] = [];
  let totalHunks = 0;
  for (let fi = 0; fi < fileContexts.length; fi++) {
    const ctx = fileContexts[fi];
    for (let hi = 0; hi < ctx.mergeInfo.hunks.length; hi++) {
      workItems.push({ fileIndex: fi, hunkIndex: hi });
    }
    totalHunks += ctx.mergeInfo.hunks.length;
  }

  info(`Processing ${totalHunks} hunks across ${fileContexts.length} files...`);

  // Step 4: Create job hierarchy
  using batchJob = JobProgress.addJob(
    "merge-all",
    `Merge ${fileContexts.length} files (${totalHunks} hunks)`
  );

  // Create per-file child jobs (these persist across work items)
  const fileJobs: JobProgress.Job[] = fileContexts.map((ctx) => {
    const hunkCount = ctx.mergeInfo.hunks.length;
    return batchJob.addChildJob(
      `file:${ctx.relativePath}`,
      `${path.basename(ctx.filePath)} (${hunkCount} hunks)`
    );
  });

  // Per-file result tracking
  const fileHunkResults: HunkResult[][] = fileContexts.map(
    (ctx) => new Array(ctx.mergeInfo.hunks.length)
  );

  // Step 5: Process all hunks in flat parallel pool
  for await (const result of parallel.map(
    workItems,
    async (item) => {
      const processor = processors[item.fileIndex];
      const fileJob = fileJobs[item.fileIndex];

      const hunkTaskId = `file:${fileContexts[item.fileIndex].relativePath}:hunk-${item.hunkIndex}`;
      using hunkJob = fileJob.addChildJob(
        hunkTaskId,
        `Hunk ${item.hunkIndex + 1}/${processor.totalHunks}`
      );

      const hunkResult = await processor.processHunk(item.hunkIndex, hunkJob);

      return { ...item, hunkResult };
    },
    { concurrency: args.concurrency }
  )) {
    fileHunkResults[result.fileIndex][result.hunkIndex] = result.hunkResult;
  }

  // Step 6: Write results and stage resolved files
  const fileResults: FileResult[] = [];
  const unresolvedFiles: FileContext[] = [];

  for (let fi = 0; fi < fileContexts.length; fi++) {
    const ctx = fileContexts[fi];
    const results = fileHunkResults[fi];
    const fileJob = fileJobs[fi];

    let appliedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    for (const r of results) {
      if (r.applied) appliedCount++;
      else if (r.error) failedCount++;
      else skippedCount++;
    }

    const resolved = processors[fi].getResolvedContent(ctx.lineEnding);
    const allResolved =
      skippedCount === 0 && failedCount === 0 && !resolved.hasConflictMarkers;
    const content = resolved.content;

    // Create backup if enabled
    if (args.createBakFile) {
      const bakFile = `${ctx.filePath}.ai_orig`;
      await fs.copyFile(ctx.filePath, bakFile);
    }

    // Write result back to working tree
    await fs.writeFile(ctx.filePath, content, "utf-8");

    if (allResolved) {
      // Stage fully resolved files
      try {
        await new GitRepo(cwd).stage(ctx.relativePath);
        fileJob.update({ message: "resolved & staged" });
      } catch {
        fileJob.warn("resolved but git add failed");
      }
    } else {
      unresolvedFiles.push(ctx);
      fileJob.update({
        message: `${appliedCount}/${results.length} hunks resolved`,
      });
    }

    fileJob.done();

    fileResults.push({
      filePath: ctx.filePath,
      relativePath: ctx.relativePath,
      appliedCount,
      skippedCount,
      failedCount,
      totalHunks: results.length,
      allResolved,
      content,
    });
  }

  batchJob.done();

  // Step 7: Print summary
  const totalApplied = fileResults.reduce((s, r) => s + r.appliedCount, 0);
  const totalSkipped = fileResults.reduce((s, r) => s + r.skippedCount, 0);
  const totalFailed = fileResults.reduce((s, r) => s + r.failedCount, 0);
  const resolvedFileCount = fileResults.filter((r) => r.allResolved).length;

  const skippedSection = () => {
    if (skippedFiles.length === 0) return "";
    const lines = skippedFiles.map(
      ({ filePath, reason }) =>
        `    ${colors.yellow(path.relative(cwd, filePath))}: ${reason}`
    );
    return `\n  ${style.heading("Skipped files:")}\n${lines.join("\n")}\n`;
  };

  const unresolvedSection = () => {
    if (unresolvedFiles.length === 0) return "";
    const lines = unresolvedFiles.map(
      (ctx) => `    ${colors.yellow(ctx.relativePath)}`
    );
    return `\n  ${style.heading("Unresolved files:")}\n${lines.join("\n")}\n`;
  };

  print(
    () => `
${style.line()}
  ${style.heading("BATCH RESULTS")}
${style.line()}
${style.label("Files:")}    ${style.success(resolvedFileCount.toString())} resolved / ${fileResults.length} total${skippedFiles.length > 0 ? ` (${skippedFiles.length} skipped)` : ""}
${style.label("Hunks:")}    ${style.success(totalApplied.toString())} applied, ${style.highlight(totalSkipped.toString())} skipped, ${colors.red(totalFailed.toString())} failed
${style.line()}
${skippedSection()}${unresolvedSection()}`
  );

  // Step 8: Launch fallback tool for unresolved files (if enabled)
  if (unresolvedFiles.length > 0 && args.fallback) {
    const { cmd } = await resolveFallbackMergeTool();
    if (cmd) {
      const tempDir = path.join(cwd, ".ai-merge-fallback-tmp");
      await fs.mkdir(tempDir, { recursive: true });

      try {
        for (const ctx of unresolvedFiles) {
          info(`Launching fallback for ${ctx.relativePath}...`);
          const stages = await extractStagesForFallback(
            cwd,
            ctx.relativePath,
            tempDir
          );
          const command = applyMergeToolArgs(
            cmd,
            stages.base,
            stages.local,
            stages.remote,
            ctx.filePath
          );
          await exec(command, { mode: "passthrough", ignoreExitCode: true });

          // Check if resolved after fallback and stage if so
          const postContent = await fs.readFile(ctx.filePath, "utf-8");
          if (!postContent.includes("<<<<<<<")) {
            try {
              await new GitRepo(cwd).stage(ctx.relativePath);
              info(`${ctx.relativePath}: resolved by fallback, staged`);
            } catch {
              // Ignore staging errors
            }
          }
        }
      } finally {
        // Clean up temp directory
        await fs
          .rm(tempDir, { recursive: true, force: true })
          .catch(() => undefined);
      }
    } else if (unresolvedFiles.length > 0) {
      warn("No fallback merge tool configured. Unresolved files remain.");
    }
  }

  // Step 9: Clean up prompts if requested
  if (args.cleanPrompts) {
    const promptDir = path.join(cwd, ".ai-merge-prompts");
    try {
      await fs.rm(promptDir, { recursive: true, force: true });
      info("Cleaned up .ai-merge-prompts folder");
    } catch {
      // Ignore cleanup errors
    }
  }

  // Exit based on final state
  if (unresolvedFiles.length === 0 && skippedFiles.length === 0) {
    info("All conflicts resolved successfully");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// =============================================================================
// Main Workflow (Single-File Mode)
// =============================================================================

async function mainSingle(): Promise<void> {
  // Print processing header
  print(
    () => `
${style.line()}
  ${style.heading("AI MERGE")}
${style.line()}
${style.label("File:")}            ${style.command(path.basename(args.merged))}
${style.label("AI provider:")}     ${args.aiProvider}, model=${args.aiModel ?? "default"}
${style.label("Min confidence:")}  ${args.minConfidence}
${style.label("Concurrency:")}     ${args.concurrency}
${style.label("Retry limit:")}     ${args.retryLimit}
`
  );

  debug(`Input files:
    base: ${args.base}
    local: ${args.local}
    remote: ${args.remote}
    merged: ${args.merged}`);

  // Step 1: Read merged file
  const mergedContent = await fs.readFile(args.merged, "utf-8");

  if (isBinaryContent(mergedContent)) {
    warn("Binary file detected.");
    if (
      args.fallback &&
      (await launchFallbackMergeTool(
        args.base,
        args.local,
        args.remote,
        args.merged
      ))
    ) {
      process.exit(0);
    }
    process.exit(1);
  }

  const lineEnding = detectLineEnding(mergedContent);
  const mergedLines = splitLines(mergedContent);

  // Step 2: Parse conflict markers
  const parseResult = parseConflictedFile(mergedLines);
  if (!parseResult.success) {
    warn(`Failed to parse conflicts: ${parseResult.error}`);
    if (
      args.fallback &&
      (await launchFallbackMergeTool(
        args.base,
        args.local,
        args.remote,
        args.merged
      ))
    ) {
      process.exit(0);
    }
    process.exit(1);
  }

  const mergeInfo = parseResult.info;
  const originalHunkCount = mergeInfo.hunks.length;

  // Step 3: Coalesce adjacent hunks (threshold < context lines)
  mergeInfo.hunks = coalesceHunks(mergeInfo.hunks, COALESCE_THRESHOLD);
  info(
    `Found ${originalHunkCount} conflict(s), coalesced to ${mergeInfo.hunks.length} hunk(s)`
  );

  // Step 4: Load file type info and sync instructions
  const template = await getPromptTemplate();
  const fileTypeInfo = getFileTypeInfoFromTemplate(template, args.merged);
  info(`File type: ${fileTypeInfo.guidance}`);

  const syncResult = await collectSyncInstructionsFromModule(
    args.merged,
    args.workingDirectory
  );
  const syncInstructions =
    syncResult.combined.length > 0
      ? `## Sync Instructions:\n\n${syncResult.combined}`
      : "";

  // Compute relative file path for display in prompts
  const relativeFilePath = path.relative(args.workingDirectory, args.merged);

  // Step 5: Process hunks with validation
  info("Starting hunk-by-hunk AI merge...");
  const processor = new FileProcessor({
    mergeInfo,
    fileTypeInfo,
    syncInstructions,
    minConfidence: args.minConfidence,
    filePath: relativeFilePath,
    retryLimit: args.retryLimit,
    provider: args.aiProvider,
  });
  const result = await processor.processAllHunks(lineEnding, args.concurrency);

  // Report summary
  print(
    () => `
${style.line()}
  ${style.heading("RESULTS")}
${style.line()}
${style.label("Applied:")} ${result.appliedCount.toString()}
${style.label("Skipped:")} ${result.skippedCount.toString()}
${style.label("Failed:")}  ${result.failedCount.toString()}
${style.line()}
`
  );

  // Step 6: Create backup file if enabled (default: true)
  if (args.createBakFile) {
    const bakFile = `${args.merged}.ai_orig`;
    await fs.copyFile(args.merged, bakFile);
    info(`Backup saved: ${bakFile}`);
  }

  // Step 7: Write result (always - may have resolved hunks even if not all)
  await fs.writeFile(args.merged, result.content, "utf-8");

  // Step 8: Handle unresolved hunks
  if (!result.allResolved) {
    if (args.fallback) {
      info("Some conflicts remain unresolved. Launching fallback tool...");
      if (
        await launchFallbackMergeTool(
          args.base,
          args.local,
          args.remote,
          args.merged
        )
      ) {
        process.exit(0);
      }
    } else {
      info("Some conflicts remain unresolved.");
    }
    process.exit(1);
  }

  // Clean up prompt files if requested
  if (args.cleanPrompts) {
    const promptDir = path.join(args.workingDirectory, ".ai-merge-prompts");
    try {
      await fs.rm(promptDir, { recursive: true, force: true });
      info("Cleaned up .ai-merge-prompts folder");
    } catch {
      // Ignore cleanup errors
    }
  }

  // All hunks resolved successfully
  info("All conflicts resolved successfully");
}

// =============================================================================
// Entry Point
// =============================================================================

async function main(): Promise<void> {
  // Parse CLI arguments
  args = await parseCliArgs();

  // Initialize logger
  initLogger({
    name: "ai-merge",
    logDir: args.logDir,
    logLevel: args.logLevel,
  });

  // Wire up loggers for all modules
  ui.setLogger(logMessage);
  JobProgress.setLogger(logMessage);
  proc.setLogger(logMessage);

  // Dispatch based on mode
  if (args.mergeAll) {
    return mainBatch();
  }

  return mainSingle();
}

// Run
main().catch((e: unknown) => {
  const err = e as { message?: string };
  error(`Fatal error: ${err.message ?? "Unknown error"}`);
});
