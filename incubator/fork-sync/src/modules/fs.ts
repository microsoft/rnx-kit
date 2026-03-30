// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Filesystem utility functions.
 *
 * Common async filesystem operations with proper error handling:
 * - Existence checks (exists, isFile, isDirectory)
 * - Directory management (ensureDir, removeDir)
 * - Content hashing with CRLF normalization (hashFileContent)
 *
 * @module fs
 */

import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as parallel from "./parallel.ts";

// =============================================================================
// Existence Checks
// =============================================================================

/**
 * Check if a path exists (file or directory).
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path exists and is a file.
 */
export async function isFile(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Check if a path exists and is a directory.
 */
export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// =============================================================================
// Directory Operations
// =============================================================================

/**
 * Create a directory and all parent directories if they don't exist.
 *
 * @throws Error if parent path is a file (cannot create directory)
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "ENOTDIR" || err.code === "EEXIST") {
      throw new Error(`Cannot create directory ${dirPath}: parent is a file`);
    }
    throw e;
  }
}

/**
 * Remove a directory and all its contents.
 * Silently succeeds if directory doesn't exist.
 */
export async function removeDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch {
    // Ignore errors (directory might not exist)
  }
}

// =============================================================================
// File Operations
// =============================================================================

/**
 * Delete a file.
 * Silently succeeds if file doesn't exist.
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore if file doesn't exist
  }
}

/**
 * Remove empty parent directories up to (but not including) the base path.
 * Walks up the directory tree and removes each empty directory.
 * Stops when hitting basePath, a non-empty directory, or an error.
 *
 * @param filePath - Starting file path (its parent directory will be checked first)
 * @param basePath - Stop path (will not be removed even if empty)
 */
export async function removeEmptyParentDirs(
  filePath: string,
  basePath: string
): Promise<void> {
  let dir = path.dirname(filePath);
  const normalizedBase = path.normalize(basePath);

  while (dir.length > normalizedBase.length && dir.startsWith(normalizedBase)) {
    try {
      const entries = await fs.readdir(dir);
      if (entries.length === 0) {
        await fs.rmdir(dir);
        dir = path.dirname(dir);
      } else {
        break; // Directory not empty, stop
      }
    } catch {
      break; // Error reading/removing, stop
    }
  }
}

// =============================================================================
// Text Content Utilities
// =============================================================================

/**
 * Detect line ending style used in content.
 * Returns '\r\n' for Windows, '\n' for Unix.
 */
export function detectLineEnding(content: string): string {
  if (content.includes("\r\n")) {
    return "\r\n";
  }
  return "\n";
}

/**
 * Split content into lines, handling both Unix (\n) and Windows (\r\n) line endings.
 */
export function splitLines(content: string): string[] {
  return content.split(/\r?\n/);
}

/**
 * Check if content appears to be binary (contains null bytes).
 */
export function isBinaryContent(content: string): boolean {
  return content.includes("\0");
}

// =============================================================================
// Content Hashing
// =============================================================================

/** Strip \r from \r\n sequences to normalize line endings. */
function normalizeCRLF(buf: Buffer): Buffer {
  if (!buf.includes(0x0d)) return buf;
  const out = Buffer.alloc(buf.length);
  let j = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x0d && buf[i + 1] === 0x0a) continue;
    out[j++] = buf[i];
  }
  return j === buf.length ? buf : out.subarray(0, j);
}

/**
 * Hash a file's content with CRLF normalization.
 * Returns a SHA-1 hex digest after normalizing \r\n → \n.
 * Returns null if the file does not exist.
 */
export async function hashFileContent(
  filePath: string
): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath);
    // SHA-1 used for content equality check, not security
    return createHash("sha1").update(normalizeCRLF(content)).digest("hex");
  } catch {
    return null;
  }
}

// =============================================================================
// Parallel File Operations
// =============================================================================

/**
 * Copy multiple files in parallel with concurrency control.
 * Yields each relative file path as it's copied, enabling progress observation.
 *
 * @param files - Array of relative file paths to copy
 * @param srcDir - Source directory
 * @param destDir - Destination directory
 * @param concurrency - Maximum concurrent copy operations (default: 32)
 * @yields Relative file path of each successfully copied file
 *
 * @example
 * ```typescript
 * let count = 0;
 * for await (const file of copyFilesInParallel(files, src, dest)) {
 *   console.log(`Copied: ${file}`);
 *   count++;
 * }
 * ```
 */
export async function* copyFilesInParallel(
  files: string[],
  srcDir: string,
  destDir: string,
  concurrency = 32
): AsyncGenerator<string> {
  const results = parallel.map(
    files,
    async (file): Promise<string | null> => {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);
      await ensureDir(path.dirname(destPath));
      if (await isFile(srcPath)) {
        await fs.copyFile(srcPath, destPath);
        return file;
      }
      return null; // Skip non-files
    },
    { concurrency }
  );

  // Filter out null values (non-files that were skipped)
  yield* parallel.filter(results, (file): file is string => file !== null);
}
