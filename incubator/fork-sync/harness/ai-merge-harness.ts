#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * AI Merge Test Harness
 *
 * A simple test script that takes a file with merge conflict markers,
 * extracts base/local/remote versions, and invokes ai-merge.ts.
 *
 * Usage:
 *   node scripts/ai-merge-test.ts --file <path-to-conflicted-file> [options]
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { ExecError, spawn } from "../modules/proc.ts";

import { parseConflictedFile } from "../modules/merge-hunks.ts";

// =============================================================================
// Constants
// =============================================================================

const SCRIPT_DIR = import.meta.dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");

/** The script name relative to cwd for help messages */
const SCRIPT_NAME = path.relative(process.cwd(), import.meta.filename);

// =============================================================================
// CLI Argument Parsing
// =============================================================================

interface ParsedArgs {
  file: string;
  directory: string;
  aiProvider?: string;
  aiModel?: string;
  minConfidence?: string;
  logLevel?: string;
}

function parseCliArgs(): ParsedArgs {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      directory: { type: "string", short: "C", default: process.cwd() },
      "ai-provider": { type: "string" },
      "ai-model": { type: "string" },
      "min-confidence": { type: "string" },
      "log-level": { type: "string" },
      help: { type: "boolean", default: false, short: "h" },
    },
    strict: true,
  });

  if (values.help) {
    console.log(`
AI Merge Test Harness

Usage: node ${SCRIPT_NAME} --file <path> [options]

Required:
  --file <path>             Path to file with merge conflict markers

Options:
  -C, --directory <path>    Working directory (default: cwd)
  --ai-provider <name>      AI provider (default: claude)
  --ai-model <model>        Optional model name for provider
  --min-confidence <level>  Minimum confidence level (HIGH, MEDIUM, LOW)
  --log-level <level>       Log level: none, error, default, debug (default: default)
  -h, --help                Show this help message

Description:
  This script takes a file containing merge conflict markers (<<<<<<< / ======= / >>>>>>>),
  extracts the base, local, and remote versions, writes them to temporary files,
  and invokes ai-merge.ts to resolve the conflicts.

Example:
  node ${SCRIPT_NAME} --file .sync/nodejs/vcbuild.bat
  node ${SCRIPT_NAME} --file test.txt --min-confidence HIGH --log-level debug
`);
    process.exit(0);
  }

  if (!values.file) {
    errorOut("Missing required argument: --file <path>");
  }

  return {
    file: values.file,
    directory: path.resolve(values.directory ?? process.cwd()),
    aiProvider: values["ai-provider"],
    aiModel: values["ai-model"],
    minConfidence: values["min-confidence"],
    logLevel: values["log-level"],
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

function info(message: string): void {
  console.log(message);
}

function errorOut(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Split content into lines, handling both Unix (\n) and Windows (\r\n) line endings.
 */
function splitLines(content: string): string[] {
  return content.split(/\r?\n/);
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = parseCliArgs();

  info("AI Merge Test Harness");
  info(`File: ${args.file}`);
  info(`Directory: ${args.directory}`);

  // Resolve input file path
  const inputPath = path.isAbsolute(args.file)
    ? args.file
    : path.resolve(args.directory, args.file);

  if (!(await exists(inputPath))) {
    errorOut(`File not found: ${inputPath}`);
  }

  // Read the input file
  const content = await fs.readFile(inputPath, "utf-8");
  const lines = splitLines(content);

  info(`Read ${lines.length} lines from input file`);

  // Parse conflict markers to extract base, local, remote
  const parseResult = parseConflictedFile(lines);

  if (!parseResult.success) {
    errorOut(`Failed to parse conflict markers: ${parseResult.error}`);
  }

  const { info: mergeInfo } = parseResult;
  info(`Found ${mergeInfo.hunks.length} conflict hunk(s)`);

  // Create temp directory
  const tempDir = path.join(REPO_ROOT, ".sync", ".temp");
  await ensureDir(tempDir);

  // Generate temp file names based on input file basename
  const basename = path.basename(inputPath);
  const basePath = path.join(tempDir, `${basename}.base`);
  const localPath = path.join(tempDir, `${basename}.local`);
  const remotePath = path.join(tempDir, `${basename}.remote`);
  // Use original file as merged (ai-merge modifies it in-place)
  const mergedPath = inputPath;

  // Write temp files
  // Note: baseLines may be null if no ||||||| markers in the file (diff2 format)
  // In that case, we use an empty file for base
  const baseContent = mergeInfo.baseLines ? mergeInfo.baseLines.join("\n") : "";
  const localContent = mergeInfo.localLines.join("\n");
  const remoteContent = mergeInfo.remoteLines.join("\n");

  await Promise.all([
    fs.writeFile(basePath, baseContent, "utf-8"),
    fs.writeFile(localPath, localContent, "utf-8"),
    fs.writeFile(remotePath, remoteContent, "utf-8"),
  ]);

  info(`Created temp files in: ${tempDir}`);
  if (args.logLevel === "debug") {
    info(`  Base:   ${basePath}`);
    info(`  Local:  ${localPath}`);
    info(`  Remote: ${remotePath}`);
    info(`  Merged: ${mergedPath}`);
  }

  // Build ai-merge arguments
  const aiMergeScript = path.join(SCRIPT_DIR, "ai-merge.ts");
  const aiMergeArgs = [
    aiMergeScript,
    "--base",
    basePath,
    "--local",
    localPath,
    "--remote",
    remotePath,
    "--merged",
    mergedPath,
    "-C",
    args.directory,
  ];

  if (args.aiProvider) {
    aiMergeArgs.push("--ai-provider", args.aiProvider);
  }
  if (args.aiModel) {
    aiMergeArgs.push("--ai-model", args.aiModel);
  }
  if (args.minConfidence) {
    aiMergeArgs.push("--min-confidence", args.minConfidence);
  }
  if (args.logLevel) {
    aiMergeArgs.push("--log-level", args.logLevel);
  }

  info(`\nInvoking ai-merge.ts...`);
  if (args.logLevel === "debug") {
    info(`Command: node ${aiMergeArgs.join(" ")}`);
  }

  // Run ai-merge with interactive mode, echoing output to terminal
  try {
    for await (const chunk of spawn("node", aiMergeArgs, {
      cwd: args.directory,
      mode: "interactive",
    })) {
      process[chunk.stream].write(chunk.text);
    }
    process.exit(0);
  } catch (e) {
    if (e instanceof ExecError) {
      process.exit(e.exitCode ?? 1);
    }
    errorOut(
      `Failed to run ai-merge: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

// Run
main().catch((e: unknown) => {
  const err = e as { message?: string };
  errorOut(`Fatal error: ${err.message ?? "Unknown error"}`);
});
