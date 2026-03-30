// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * KDiff3 (diff3) format merge conflict parser and resolution utilities.
 *
 * This module provides tools for parsing files with KDiff3/diff3-style conflict
 * markers, extracting individual hunks, and applying AI-generated resolutions.
 *
 * ## Conflict Marker Format
 *
 * ```
 * <<<<<<< LOCAL
 * content from local branch
 * ||||||| BASE (optional - present in diff3 format)
 * content from common ancestor
 * =======
 * content from remote branch
 * >>>>>>> REMOTE
 * ```
 *
 * ## Main Functions
 *
 * - `parseConflictedFile(lines)` - Parse a file and reconstruct base/local/remote versions
 * - `coalesceHunks(hunks, threshold)` - Merge adjacent hunks within a distance threshold
 * - `getHunkToMerge(info, index, context)` - Extract a hunk with context for AI resolution
 * - `applyResolved(info, index, context, resolved)` - Validate and store resolved content
 * - `getResolved(info)` - Reconstruct file with resolved hunks
 *
 * ## Workflow
 *
 * 1. Parse the conflicted file: `parseConflictedFile(lines)`
 * 2. Optionally coalesce adjacent hunks: `coalesceHunks(hunks, threshold)`
 * 3. For each hunk:
 *    - Get hunk with context: `getHunkToMerge(info, i, contextLines)`
 *    - Send to AI for resolution
 *    - Apply resolution: `applyResolved(info, i, contextLines, resolved)`
 * 4. Get final file: `getResolved(info)`
 *
 * ## LineSpan Convention
 *
 * All spans use 0-based indexing with `{ start, count }` format:
 * - `start`: Index of first line in the array
 * - `count`: Number of lines (can be 0 for empty sections)
 */

// =============================================================================
// Types
// =============================================================================

/** Line span representation: start index + count */
export interface LineSpan {
  /** 0-based starting line index (index into the lines array) */
  start: number;
  /** Number of lines (can be 0 if section is empty) */
  count: number;
}

/** Information about a single conflict hunk */
export interface HunkInfo {
  /** 0-based index of this hunk in the file */
  index: number;

  /** Line span in the merged/conflicted file (includes markers) */
  mergedSpan: LineSpan;

  /** Line span in the base file (null if base section absent in this hunk) */
  baseSpan: LineSpan | null;

  /** Line span in the local file */
  localSpan: LineSpan;

  /** Line span in the remote file */
  remoteSpan: LineSpan;

  /** Resolved content for this hunk (set by applyResolved) */
  resolved?: string[];
}

/** All data needed for merge operations */
export interface MergeInfo {
  /** Original merged/conflicted file lines (input to parseConflictedFile) */
  merged: string[];

  /** Reconstructed base file lines (null if no ||||||| markers in file) */
  baseLines: string[] | null;

  /** Reconstructed local file lines */
  localLines: string[];

  /** Reconstructed remote file lines */
  remoteLines: string[];

  /** Information about each conflict hunk */
  hunks: HunkInfo[];
}

/** Result of parsing a conflicted file - success case */
export interface ParseSuccess {
  success: true;

  /** All merge-related data */
  info: MergeInfo;
}

/** Result of parsing - error case (no hunks found) */
export interface ParseError {
  success: false;
  error: string;
}

/** Result of parsing a conflicted file */
export type ParseResult = ParseSuccess | ParseError;

/** Result of applying a resolved hunk */
export interface ApplyResult {
  success: boolean;
  error?: string;
}

/** Result of getting resolved content */
export interface ResolvedResult {
  /** The file content with resolved hunks */
  lines: string[];
  /** True if all hunks have been resolved */
  isComplete: boolean;
  /** True if the resolved content still contains conflict markers */
  hasConflictMarkers: boolean;
}

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Extract lines from an array using a LineSpan.
 * @param lines - Source array of lines
 * @param span - The span indicating which lines to extract
 * @returns Array of lines from span.start to span.start + span.count
 */
export function extractLines(lines: string[], span: LineSpan): string[] {
  return lines.slice(span.start, span.start + span.count);
}

// =============================================================================
// Marker detection
// =============================================================================

/** Check if line starts with <<<<<<< marker */
function isLocalMarker(line: string): boolean {
  return line.startsWith("<<<<<<<");
}

/** Check if line starts with ||||||| marker */
function isBaseMarker(line: string): boolean {
  return line.startsWith("|||||||");
}

/** Check if line starts with ======= marker */
function isSeparatorMarker(line: string): boolean {
  return line.startsWith("=======");
}

/** Check if line starts with >>>>>>> marker */
function isRemoteMarker(line: string): boolean {
  return line.startsWith(">>>>>>>");
}

// =============================================================================
// Main parser
// =============================================================================

/**
 * Parse a file with KDiff3 (diff3) conflict markers.
 *
 * @param lines - Array of lines from the conflicted file
 * @returns ParseResult with reconstructed files and hunk info, or error if no conflicts
 */
export function parseConflictedFile(lines: string[]): ParseResult {
  // Output arrays for reconstructed files
  const baseOutput: string[] = [];
  const localOutput: string[] = [];
  const remoteOutput: string[] = [];

  // Hunk collection
  const hunks: HunkInfo[] = [];

  // Track if we've seen any ||||||| markers (to determine if base is available)
  let hasBaseMarkers = false;

  // Parser state
  type ParserState = "normal" | "local" | "base" | "remote";
  let state: ParserState = "normal";

  // Current hunk tracking
  let hunkStartIndex = 0;
  let hunkLocalStartIndex = 0;
  let hunkBaseStartIndex = 0;
  let hunkRemoteStartIndex = 0;
  let hunkLocalCount = 0;
  let hunkBaseCount = 0;
  let hunkRemoteCount = 0;
  let hunkHasBase = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    switch (state) {
      case "normal":
        if (isLocalMarker(line)) {
          // Start of a conflict hunk
          state = "local";
          hunkStartIndex = i;
          hunkLocalCount = 0;
          hunkBaseCount = 0;
          hunkRemoteCount = 0;
          hunkHasBase = false;
          hunkLocalStartIndex = localOutput.length;
          hunkBaseStartIndex = baseOutput.length;
          hunkRemoteStartIndex = remoteOutput.length;
        } else {
          // Normal line - add to all outputs
          baseOutput.push(line);
          localOutput.push(line);
          remoteOutput.push(line);
        }
        break;

      case "local":
        if (isBaseMarker(line)) {
          // Switch to base section
          state = "base";
          hunkHasBase = true;
          hasBaseMarkers = true;
        } else if (isSeparatorMarker(line)) {
          // No base section, switch directly to remote
          state = "remote";
        } else {
          // Content line for local
          localOutput.push(line);
          hunkLocalCount++;
        }
        break;

      case "base":
        if (isSeparatorMarker(line)) {
          // Switch to remote section
          state = "remote";
        } else {
          // Content line for base
          baseOutput.push(line);
          hunkBaseCount++;
        }
        break;

      case "remote":
        if (isRemoteMarker(line)) {
          // End of conflict hunk
          state = "normal";

          // Create hunk info
          const hunk: HunkInfo = {
            index: hunks.length,
            mergedSpan: {
              start: hunkStartIndex,
              count: i - hunkStartIndex + 1, // +1 to include the >>>>>>> line
            },
            localSpan: {
              start: hunkLocalStartIndex,
              count: hunkLocalCount,
            },
            remoteSpan: {
              start: hunkRemoteStartIndex,
              count: hunkRemoteCount,
            },
            baseSpan: hunkHasBase
              ? {
                  start: hunkBaseStartIndex,
                  count: hunkBaseCount,
                }
              : null,
          };

          hunks.push(hunk);
        } else {
          // Content line for remote
          remoteOutput.push(line);
          hunkRemoteCount++;
        }
        break;
    }
  }

  // Check if we found any hunks
  if (hunks.length === 0) {
    return {
      success: false,
      error: "No conflict markers found in the input",
    };
  }

  // Check if parser ended in an unexpected state (malformed input)
  if (state !== "normal") {
    return {
      success: false,
      error: `Malformed conflict markers: parser ended in '${state}' state`,
    };
  }

  return {
    success: true,
    info: {
      merged: lines,
      baseLines: hasBaseMarkers ? baseOutput : null,
      localLines: localOutput,
      remoteLines: remoteOutput,
      hunks,
    },
  };
}

// =============================================================================
// Hunk coalescing
// =============================================================================

/**
 * Merge a group of hunks into a single hunk.
 * @param group - Array of hunks to merge (must have at least one hunk)
 * @returns A single merged hunk
 */
function mergeHunkGroup(group: HunkInfo[]): HunkInfo {
  if (group.length === 1) {
    return group[0];
  }

  const first = group[0];
  const last = group[group.length - 1];

  // Check if all hunks have baseSpan
  const allHaveBase = group.every((h) => h.baseSpan !== null);

  return {
    index: 0, // Will be set by caller
    mergedSpan: {
      start: first.mergedSpan.start,
      count:
        last.mergedSpan.start + last.mergedSpan.count - first.mergedSpan.start,
    },
    localSpan: {
      start: first.localSpan.start,
      count:
        last.localSpan.start + last.localSpan.count - first.localSpan.start,
    },
    remoteSpan: {
      start: first.remoteSpan.start,
      count:
        last.remoteSpan.start + last.remoteSpan.count - first.remoteSpan.start,
    },
    baseSpan: allHaveBase
      ? {
          start: first.baseSpan!.start,
          count:
            last.baseSpan!.start + last.baseSpan!.count - first.baseSpan!.start,
        }
      : null,
  };
}

/**
 * Coalesce adjacent hunks that are within a specified distance of each other.
 *
 * @param hunks - Array of hunks from parseConflictedFile
 * @param distanceThreshold - Maximum number of lines between hunks to coalesce (0 = adjacent)
 * @returns New array of coalesced hunks with updated indices
 */
export function coalesceHunks(
  hunks: HunkInfo[],
  distanceThreshold: number
): HunkInfo[] {
  if (hunks.length <= 1) {
    return [...hunks];
  }

  const result: HunkInfo[] = [];
  let currentGroup: HunkInfo[] = [hunks[0]];

  for (let i = 1; i < hunks.length; i++) {
    const prevHunk = currentGroup[currentGroup.length - 1];
    const currHunk = hunks[i];

    // Calculate distance between hunks in merged file
    const prevEnd = prevHunk.mergedSpan.start + prevHunk.mergedSpan.count;
    const currStart = currHunk.mergedSpan.start;
    const distance = currStart - prevEnd;

    if (distance <= distanceThreshold) {
      // Add to current group
      currentGroup.push(currHunk);
    } else {
      // Finalize current group and start new one
      result.push(mergeHunkGroup(currentGroup));
      currentGroup = [currHunk];
    }
  }

  // Don't forget the last group
  result.push(mergeHunkGroup(currentGroup));

  // Re-index
  return result.map((hunk, i) => ({ ...hunk, index: i }));
}

// =============================================================================
// Hunk merge preparation and resolution
// =============================================================================

/**
 * Prepare a hunk for AI merge resolution.
 *
 * Formats the hunk with conflict markers and surrounding context lines.
 * The context lines come from the reconstructed local file (which has the same
 * "normal" lines as base and remote files).
 *
 * @param info - MergeInfo containing all file data
 * @param hunkIndex - Index of the hunk to prepare
 * @param contextLineCount - Number of context lines to include before/after
 * @returns Formatted hunk with context and conflict markers
 */
export function getHunkToMerge(
  info: MergeInfo,
  hunkIndex: number,
  contextLineCount: number
): string[] {
  const hunk = info.hunks[hunkIndex];
  const { localLines, baseLines, remoteLines } = info;

  // Calculate actual context available (may be less at file boundaries)
  const actualBefore = Math.min(contextLineCount, hunk.localSpan.start);
  const actualAfter = Math.min(
    contextLineCount,
    localLines.length - (hunk.localSpan.start + hunk.localSpan.count)
  );

  const result: string[] = [];

  // Context lines before
  result.push(
    ...localLines.slice(
      hunk.localSpan.start - actualBefore,
      hunk.localSpan.start
    )
  );

  // Local marker and content
  result.push("<<<<<<< LOCAL");
  result.push(...extractLines(localLines, hunk.localSpan));

  // Base marker and content (if present)
  if (hunk.baseSpan !== null && baseLines !== null) {
    result.push("||||||| BASE");
    result.push(...extractLines(baseLines, hunk.baseSpan));
  }

  // Separator and remote content
  result.push("=======");
  result.push(...extractLines(remoteLines, hunk.remoteSpan));
  result.push(">>>>>>> REMOTE");

  // Context lines after
  const afterStart = hunk.localSpan.start + hunk.localSpan.count;
  result.push(...localLines.slice(afterStart, afterStart + actualAfter));

  return result;
}

/**
 * Apply resolved content to a hunk, validating context lines match.
 *
 * The resolved content should include the same context lines that were
 * provided by getHunkToMerge. This function validates that the context
 * lines are unchanged, then extracts and stores the resolved content.
 *
 * @param info - MergeInfo containing all file data
 * @param hunkIndex - Index of the hunk being resolved
 * @param contextLineCount - Number of context lines that were included (same as getHunkToMerge)
 * @param resolvedLines - The AI's resolved output
 * @returns ApplyResult indicating success or failure with error message
 */
export function applyResolved(
  info: MergeInfo,
  hunkIndex: number,
  contextLineCount: number,
  resolvedLines: string[]
): ApplyResult {
  const hunk = info.hunks[hunkIndex];
  const { localLines } = info;

  // Calculate actual context (same as getHunkToMerge)
  const actualBefore = Math.min(contextLineCount, hunk.localSpan.start);
  const actualAfter = Math.min(
    contextLineCount,
    localLines.length - (hunk.localSpan.start + hunk.localSpan.count)
  );

  // Validate context before
  for (let i = 0; i < actualBefore; i++) {
    const expectedLine = localLines[hunk.localSpan.start - actualBefore + i];
    const actualLine = resolvedLines[i];
    if (expectedLine !== actualLine) {
      return {
        success: false,
        error: `Context before mismatch at line ${i}: expected "${expectedLine}", got "${actualLine}"`,
      };
    }
  }

  // Validate context after
  for (let i = 0; i < actualAfter; i++) {
    const expectedLine =
      localLines[hunk.localSpan.start + hunk.localSpan.count + i];
    const actualLine = resolvedLines[resolvedLines.length - actualAfter + i];
    if (expectedLine !== actualLine) {
      return {
        success: false,
        error: `Context after mismatch at line ${i}: expected "${expectedLine}", got "${actualLine}"`,
      };
    }
  }

  // Extract resolved content (middle part without context)
  const resolved = resolvedLines.slice(
    actualBefore,
    resolvedLines.length - actualAfter
  );

  // Store in hunk
  info.hunks[hunkIndex].resolved = resolved;

  return { success: true };
}

// =============================================================================
// File reconstruction
// =============================================================================

/**
 * Get the resolved file content.
 *
 * Reconstructs the file by:
 * - Copying lines outside hunks as-is from the merged array
 * - For each hunk: using resolved content if available, otherwise the original mergedSpan
 *
 * @param info - MergeInfo containing all file data
 * @returns ResolvedResult with lines and completion status
 */
export function getResolved(info: MergeInfo): ResolvedResult {
  const result: string[] = [];
  let currentPos = 0;
  let isComplete = true;

  for (const hunk of info.hunks) {
    // Copy lines before this hunk (or between hunks)
    result.push(...info.merged.slice(currentPos, hunk.mergedSpan.start));

    // Add resolved content or original conflict
    if (hunk.resolved !== undefined) {
      result.push(...hunk.resolved);
    } else {
      // Use original conflict lines from merged
      result.push(...extractLines(info.merged, hunk.mergedSpan));
      isComplete = false;
    }

    // Update position to after this hunk
    currentPos = hunk.mergedSpan.start + hunk.mergedSpan.count;
  }

  // Copy remaining lines after last hunk
  result.push(...info.merged.slice(currentPos));

  // Check if any conflict markers remain in the resolved content
  const hasConflictMarkers = result.some(
    (line) =>
      isLocalMarker(line) || isSeparatorMarker(line) || isRemoteMarker(line)
  );

  return { lines: result, isComplete, hasConflictMarkers };
}
