// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Unified TTY utilities and progress UI for CLI applications.
 *
 * This module provides:
 * - **TTY detection**: `isTTY()`, `withTTY()` for temporary overrides
 * - **Colors**: `colors.green()`, `colors.red()`, `colors.yellow()`, etc.
 * - **Icons**: `icons.ok()`, `icons.fail()`, `icons.spinner()`, etc.
 * - **Cursor control**: `cursor.hide()`, `cursor.show()`, `cursor.up()`, etc.
 * - **Progress bars**: `progressBar()` with half-block precision
 * - **Text styling**: `style.heading()`, `style.command()`, `style.success()`, etc.
 * - **Progress UI**: `progress.start()`, `progress.add()`, `progress.update()`, etc.
 * - **Message output**: `print()`, `info()`, `warn()`, `error()`, `fatal()`, `exit()`
 * - **User prompts**: `confirm()` for yes/no questions
 *
 * Gracefully falls back to ASCII-safe output for non-TTY environments (CI, pipes).
 *
 * **TTY mode**: Lines update in-place with cursor movement and animated spinners.
 * **Non-TTY mode**: Each update prints a new line with [id] prefix.
 *
 * @example
 * ```typescript
 * using session = progress.start();
 *
 * // Create lines with options
 * const line = progress.add('task-1', 'Working...', { progressBar: 0 });
 *
 * // Update any combination of fields
 * progress.update(line, { progressBar: 0.5, message: 'Halfway there' });
 * progress.update(line, { state: 'done', progressBar: 1, message: 'Complete' });
 *
 * // Pause for external output
 * using paused = progress.suspend();
 * console.log('External output here');
 * ```
 *
 * @module tty-ui
 */

import * as readline from "node:readline";
import { resolve, type LazyString, type LoggerCallback } from "./common.ts";

// =============================================================================
// Constants
// =============================================================================

/** Animation interval in milliseconds */
const ANIMATION_INTERVAL = 150;

/** Default width for formatting */
const DEFAULT_WIDTH = 80;

// =============================================================================
// Types
// =============================================================================

/** Line state type */
export type ProgressState =
  | "pending"
  | "processing"
  | "done"
  | "warn"
  | "failed";

/** Progress line data */
export interface ProgressLine {
  id: string;
  message: LazyString;
  state: ProgressState;
  indent: number; // spaces to indent by
  progressBar?: number; // Progress value 0.0 to 1.0, undefined = no bar
}

/** Options for creating a progress line */
export interface ProgressLineOptions {
  state?: ProgressState; // default 'processing'
  indent?: number; // default 0
  progressBar?: number; // default undefined
}

/** Updatable fields of a progress line */
export type ProgressLineUpdate = Partial<
  Pick<ProgressLine, "state" | "message" | "progressBar">
>;

// Internal - extends public with private fields
interface InternalProgressLine extends ProgressLine {
  lastPrinted?: string; // For non-TTY deduplication
}

/**
 * Render a LazyString with specific TTY mode.
 * If the input is already a string, returns it as-is.
 * If it's a function, calls it with the specified TTY context.
 */
export function renderString(lazy: LazyString, tty?: boolean): string {
  if (typeof lazy === "string") return lazy;
  using _ = withTTY(tty === undefined ? isTTY() : tty);
  return lazy();
}

/**
 * Render a LazyString for both TTY and log output.
 * Returns a tuple [ttyText, logText].
 */
export function renderBoth(lazy: LazyString): [tty: string, log: string] {
  const ttyText = renderString(lazy);
  return [ttyText, isTTY() ? renderString(lazy, false) : ttyText];
}

/**
 * Create a LazyString that shows different content on TTY vs log/non-TTY.
 * Useful for progress steps where TTY shows a static message (with a progress
 * bar) while the log shows per-item detail (e.g. file names).
 *
 * @param tty - Message shown on TTY (typically static)
 * @param log - Message shown in log/non-TTY (typically dynamic)
 */
export function ttyOrLog(tty: LazyString, log: LazyString): LazyString {
  return () => resolve(isTTY() ? tty : log);
}

// =============================================================================
// Module State
// =============================================================================

const isProcessTTY = process.stdout.isTTY ?? false;
let ttyOverride: boolean | undefined;

const lines: ProgressLine[] = [];
let animationTimer: ReturnType<typeof setInterval> | null = null;
let animationFrame = 0;
let started = false;
let suspensionCount = 0;
let drawingHeight = 0;
let logger: LoggerCallback | undefined;

// =============================================================================
// TTY Detection
// =============================================================================

/** Whether stdout is a TTY (interactive terminal) */
export function isTTY(): boolean {
  if (ttyOverride !== undefined) return ttyOverride;
  return isProcessTTY;
}

/**
 * Temporarily override TTY detection.
 * Use with `using` for automatic cleanup.
 *
 * @example
 * ```typescript
 * using _ = withTTY(false);
 * // all isTTY() calls return false in this scope
 * ```
 */
export function withTTY(value: boolean): Disposable {
  const previous = ttyOverride;
  ttyOverride = value;
  return {
    [Symbol.dispose]() {
      ttyOverride = previous;
    },
  };
}

/**
 * Set a global logger function for the tty-ui module.
 * All output calls will invoke the logger with "ui: " prefix.
 * Pass undefined to disable logging.
 */
export function setLogger(fn: LoggerCallback | undefined): void {
  logger = fn;
}

// =============================================================================
// ANSI Escape Codes
// =============================================================================

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  brightGreen: "\x1b[92m",
  red: "\x1b[31m",
  brightRed: "\x1b[91m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
};

// =============================================================================
// Cursor Control (TTY-only)
// =============================================================================

/**
 * Cursor control utilities for TTY output.
 * These write directly to stdout and are no-ops in non-TTY mode.
 */
export const cursor = {
  /** Hide the cursor */
  hide: () => {
    if (isTTY()) process.stdout.write(ANSI.hideCursor);
  },
  /** Show the cursor */
  show: () => {
    if (isTTY()) process.stdout.write(ANSI.showCursor);
  },
  /** Move cursor up N lines */
  up: (n: number) => {
    if (isTTY() && n > 0) process.stdout.write(`\x1b[${n}A`);
  },
  /** Move cursor down N lines */
  down: (n: number) => {
    if (isTTY() && n > 0) process.stdout.write(`\x1b[${n}B`);
  },
  /** Write text, clear to end of line, then newline. */
  writeLine: (text: LazyString) => {
    const [ttyText, logText] = renderBoth(text);

    if (isTTY()) {
      const truncated = truncateToWidth(ttyText);
      process.stdout.write(`\r${truncated}\x1b[K\n`);
    } else if (ttyText) {
      console.log(ttyText);
    }
    if (logText) {
      logger?.("info", `ui: ${logText}`);
    }
  },
};

// =============================================================================
// Colors (TTY-aware)
// =============================================================================

/**
 * TTY-aware color functions.
 * Returns colored text for TTY, plain text for non-TTY.
 */
export const colors = {
  green: (text: string) =>
    isTTY() ? `${ANSI.green}${text}${ANSI.reset}` : text,
  red: (text: string) => (isTTY() ? `${ANSI.red}${text}${ANSI.reset}` : text),
  yellow: (text: string) =>
    isTTY() ? `${ANSI.yellow}${text}${ANSI.reset}` : text,
  cyan: (text: string) => (isTTY() ? `${ANSI.cyan}${text}${ANSI.reset}` : text),
  bold: (text: string) => (isTTY() ? `${ANSI.bold}${text}${ANSI.reset}` : text),
  reset: ANSI.reset,
};

// =============================================================================
// Icons (TTY-aware)
// =============================================================================

/** Braille spinner characters */
const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * TTY-aware icon functions.
 * Returns UTF-8 icons for TTY, ASCII-safe text for non-TTY.
 */
export const icons = {
  ok: () => (isTTY() ? colors.green("✓") : "[OK]"),
  fail: () => (isTTY() ? colors.red("✗") : "[FAIL]"),
  warn: () => (isTTY() ? colors.yellow("⚠") : "[WARN]"),
  info: () => (isTTY() ? colors.cyan("ℹ") : "[i]"),
  prompt: () => (isTTY() ? colors.cyan("❯") : ">"),
  pending: () => (isTTY() ? "•" : "-"),
  spinner: (index: number): string =>
    isTTY() ? colors.green(spinnerChars[index % spinnerChars.length]) : "*",
};

// =============================================================================
// Progress Bar (TTY-aware)
// =============================================================================

/**
 * Render a TTY-aware progress bar with 10 steps in 5 characters.
 * Uses half-filled blocks for odd steps in TTY mode.
 * Returns percentage text like "[50%]" in non-TTY mode.
 * Returns empty string if value is undefined.
 *
 * @param value - Progress value from 0.0 to 1.0, or undefined to hide
 * @returns Formatted string, or empty if undefined
 *
 * @example
 * ```typescript
 * // TTY mode:
 * progressBar(0)    // "[_____]"
 * progressBar(0.5)  // "[██▌__]"
 * progressBar(1)    // "[█████]"
 *
 * // Non-TTY mode:
 * progressBar(0)    // "[0%]"
 * progressBar(0.5)  // "[50%]"
 * progressBar(1)    // "[100%]"
 *
 * progressBar(undefined)  // ""
 * ```
 */
export function progressBar(value: number | undefined): string {
  if (value === undefined) return "";

  const clamped = Math.max(0, Math.min(1, value));

  if (isTTY()) {
    const steps = Math.round(clamped * 10);
    const fullBlocks = Math.floor(steps / 2);
    const halfBlock = steps % 2 === 1;
    const empty = 5 - fullBlocks - (halfBlock ? 1 : 0);
    return (
      "[" +
      "█".repeat(fullBlocks) +
      (halfBlock ? "▌" : "") +
      "_".repeat(empty) +
      "]"
    );
  }

  return `[${Math.round(clamped * 100)}%]`;
}

// =============================================================================
// Limit text to terminal width
// =============================================================================

/** Get terminal width (default 80 if not TTY) */
export function terminalWidth(): number {
  return process.stdout.columns ?? 80;
}

/** Truncate text to fit within maxWidth, preserving ANSI codes */
export function truncateToWidth(text: string, maxWidth?: number): string {
  const width = maxWidth ?? terminalWidth();
  if (width <= 0) return "";
  if (width === 1 && text.length > 0) return "…";

  let visibleCount = 0;
  let inEscape = false;
  let cutIndex = -1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inEscape) {
      if ((char >= "A" && char <= "Z") || (char >= "a" && char <= "z")) {
        inEscape = false;
      }
      continue;
    }
    if (char === "\x1b" && text[i + 1] === "[") {
      inEscape = true;
      continue;
    }

    visibleCount++;
    if (visibleCount > width) {
      // More than width chars, truncate at saved position
      return text.slice(0, cutIndex) + "…" + ANSI.reset;
    }
    if (visibleCount === width - 1) {
      cutIndex = i + 1; // remember where to cut
    }
  }

  return text; // fits, no truncation
}

// =============================================================================
// Text Styling (TTY-aware)
// =============================================================================

/**
 * Semantic text styling functions.
 * Returns styled text for TTY, plain text for non-TTY.
 */
export const style = {
  /**
   * Create a horizontal line separator.
   * Uses box-drawing double line (═) for TTY, equals (=) for non-TTY.
   *
   * @param width - Line width (default: min of terminal width and 60)
   * @returns Repeated line character
   *
   * @example
   * ```typescript
   * style.line()      // "════════════════════════════════════════════════════════════"
   * style.line(20)    // "════════════════════"
   * ```
   */
  line: (width?: number): string => {
    const w = width ?? Math.min(terminalWidth(), DEFAULT_WIDTH);
    const char = isTTY() ? "═" : "=";
    return char.repeat(w);
  },

  /**
   * Format text as a heading (bold cyan in TTY).
   * Use for section titles in multi-line output blocks.
   */
  heading: (text: string): string =>
    isTTY() ? `${ANSI.bold}${ANSI.cyan}${text}${ANSI.reset}` : text,

  /**
   * Format text as a command (cyan in TTY).
   * Use for CLI commands that users should run.
   */
  command: (text: string): string => colors.cyan(text),

  /**
   * Format text as success (green in TTY).
   * Use for positive outcomes, resolved counts, etc.
   */
  success: (text: string): string => colors.green(text),

  /**
   * Format text as highlighted/warning (yellow in TTY).
   * Use for attention-grabbing text, conflict counts, etc.
   */
  highlight: (text: string): string => colors.yellow(text),

  /**
   * Format text as a label (cyan in TTY).
   * Use for field labels in info blocks (e.g., "Dependency:", "Target:").
   */
  label: (text: string): string => colors.cyan(text),
};

// =============================================================================
// Progress UI
// =============================================================================

/**
 * Progress UI for multi-line animated terminal output.
 *
 * @example
 * ```typescript
 * using session = progress.start();
 *
 * const line = progress.add('task-1', 'Working...', { progressBar: 0 });
 * progress.update(line, { progressBar: 0.5, message: 'Halfway' });
 * progress.update(line, { state: 'done', progressBar: 1 });
 *
 * // Pause for external output
 * using paused = progress.suspend();
 * console.log('External output');
 * ```
 */
export const progress = {
  /**
   * Get all progress lines (read-only view of internal array).
   */
  getAll: (): readonly ProgressLine[] => lines,

  /**
   * Add a new progress line at the end.
   * Lines are displayed in the order they are added.
   *
   * @param id - Unique identifier for this line
   * @param message - Initial message to display
   * @param options - Optional settings (state, indent, progressBar)
   * @returns The created ProgressLine object
   *
   * @example
   * ```typescript
   * progress.add('task-1', 'Working...');
   * progress.add('task-2', 'Pending', { state: 'pending' });
   * progress.add('task-3', 'Loading', { progressBar: 0 });
   * ```
   */
  add: (
    id: string,
    message: LazyString,
    options?: ProgressLineOptions
  ): ProgressLine => {
    return progress.insert(lines.length, id, message, options);
  },

  /**
   * Insert a new progress line at a specific index.
   *
   * @param index - Position to insert at (clamped to valid range)
   * @param id - Unique identifier for this line
   * @param message - Initial message to display
   * @param options - Optional settings (state, indent, progressBar)
   * @returns The created ProgressLine object
   */
  insert: (
    index: number,
    id: string,
    message: LazyString,
    options?: ProgressLineOptions
  ): ProgressLine => {
    index = clampIndex(index, 0, lines.length);
    const newLine: ProgressLine = {
      id,
      message,
      state: options?.state ?? "processing",
      indent: options?.indent ?? 0,
      progressBar: options?.progressBar,
    };
    lines.splice(index, 0, newLine);
    drawLines(index, lines.length);
    return newLine;
  },

  /**
   * Insert a new progress line after an existing line.
   *
   * @param afterLine - The line to insert after, or null to insert at beginning
   * @param id - Unique identifier for this line
   * @param message - Initial message to display
   * @param options - Optional settings (state, indent, progressBar)
   * @returns The created ProgressLine object
   */
  insertAfter: (
    afterLine: ProgressLine | null,
    id: string,
    message: LazyString,
    options?: ProgressLineOptions
  ): ProgressLine => {
    if (afterLine === null) {
      return progress.insert(0, id, message, options);
    }
    const index = lines.indexOf(afterLine);
    if (index === -1) {
      return progress.add(id, message, options);
    }
    return progress.insert(index + 1, id, message, options);
  },

  /**
   * Remove a line at a specific index.
   *
   * @param index - Index to remove
   * @returns The removed line, or undefined if index is invalid
   */
  removeAt: (index: number): ProgressLine | undefined => {
    if (index < 0 || index >= lines.length) {
      return undefined;
    }
    const [removed] = lines.splice(index, 1);
    drawLines(index, lines.length);
    return removed;
  },

  /**
   * Remove a specific line from tracking.
   *
   * @param line - The line object to remove
   * @returns The removed line, or undefined if not found
   */
  remove: (line: ProgressLine): ProgressLine | undefined => {
    return progress.removeAt(lines.indexOf(line));
  },

  /**
   * Remove all lines from tracking.
   *
   * @returns Array of all removed lines
   */
  removeAll: (): ProgressLine[] => {
    const removedLines = lines.splice(0, lines.length);
    adjustDrawingHeight(0);
    return removedLines;
  },

  /**
   * Update a line's state, message, and/or progress bar.
   *
   * @param line - The line to update
   * @param changes - Fields to update (state, message, progressBar)
   *
   * @example
   * ```typescript
   * progress.update(line, { state: 'done' });
   * progress.update(line, { progressBar: 0.5 });
   * progress.update(line, { state: 'done', message: 'Complete', progressBar: 1 });
   * ```
   */
  update: (line: ProgressLine, changes: ProgressLineUpdate): void => {
    if (changes.state !== undefined) line.state = changes.state;
    if (changes.message !== undefined) line.message = changes.message;
    if ("progressBar" in changes) line.progressBar = changes.progressBar;
    const index = lines.indexOf(line);
    drawLines(index, index + 1);
  },

  /**
   * Start the progress UI and animation timer.
   * Returns a Disposable for automatic cleanup with `using`.
   *
   * @returns Disposable that calls stop() when disposed
   *
   * @example
   * ```typescript
   * using session = progress.start();
   * // work with progress lines
   * // auto-stops when session goes out of scope
   * ```
   */
  start: (): Disposable => {
    if (started) {
      return {
        [Symbol.dispose](): void {
          /* no-op */
        },
      };
    }
    started = true;
    cursor.hide();
    drawLines(0, lines.length);

    if (isTTY()) {
      animationTimer = setInterval(animationTick, ANIMATION_INTERVAL);
    }

    return {
      [Symbol.dispose]() {
        progress.stop();
      },
    };
  },

  /**
   * Stop animations and clean up.
   * Clears all lines and restores cursor visibility.
   */
  stop: (): void => {
    if (!started) return;
    started = false;
    cursor.show();

    if (animationTimer) {
      clearInterval(animationTimer);
      animationTimer = null;
    }

    progress.removeAll();
  },

  /**
   * Suspend progress display for external output.
   * Returns a Disposable for automatic resume with `using`.
   *
   * @returns Disposable that calls resume() when disposed
   *
   * @example
   * ```typescript
   * using paused = progress.suspend();
   * console.log("external output");
   * // auto-resumes when paused goes out of scope
   * ```
   */
  suspend: (): Disposable => {
    if (suspensionCount === 0) adjustDrawingHeight(0);
    ++suspensionCount;

    return {
      [Symbol.dispose]() {
        progress.resume();
      },
    };
  },

  /**
   * Resume progress display after suspension.
   * Redraws all progress lines at their current state.
   *
   * @throws Error if called without a matching suspend()
   */
  resume: (): void => {
    if (--suspensionCount < 0) {
      suspensionCount = 0;
      throw new Error("resume() called without matching suspend()");
    }
    if (suspensionCount === 0) drawLines(0, lines.length);
  },

  /**
   * Format a line for display.
   * When asTTY is specified, returns an evaluated string (backward compatible).
   * When asTTY is omitted, returns a LazyString for deferred evaluation.
   *
   * @param line - The line to format
   * @param asTTY - Override TTY detection (true = TTY format, false = non-TTY format)
   * @returns LazyString - string if asTTY specified, function if asTTY omitted
   *
   * @example
   * ```typescript
   * const ttyText = progress.format(line, true) as string;   // for terminal
   * const logText = progress.format(line, false) as string;  // for log file
   * const lazy = progress.format(line);                       // deferred
   * ```
   */
  format: (line: ProgressLine, asTTY?: boolean): LazyString => {
    // If explicit TTY mode requested, return evaluated string (backward compat)
    if (asTTY !== undefined) {
      using _ = withTTY(asTTY);
      return formatLineImpl(line);
    }
    // Return lazy function for deferred evaluation
    return () => formatLineImpl(line);
  },
};

// =============================================================================
// User Confirmation
// =============================================================================

/**
 * Options for the confirm function.
 */
export interface ConfirmOptions {
  /** If true, skip prompting and return true immediately. */
  yes?: boolean;
}

/**
 * Prompt the user for yes/no confirmation.
 * Automatically suspends progress display while waiting for input.
 *
 * Behavior:
 * - If `options.yes` is true, returns true immediately (for --yes flag)
 * - In non-TTY mode (CI/piped), returns false (safe default)
 * - In TTY mode, prompts user and returns their answer
 *
 * @param message - The prompt message to display
 * @param options - Optional settings (yes: skip prompt and return true)
 * @returns true if user answered 'y' or 'Y', false otherwise
 */
export async function confirm(
  message: string,
  options?: ConfirmOptions
): Promise<boolean> {
  // If --yes flag is set, always return true (skip prompt)
  if (options?.yes) {
    return true;
  }

  // In non-TTY mode, return false (safe default - won't hang in CI)
  if (!isTTY()) {
    return false;
  }

  // Interactive TTY mode: prompt user
  using _ = progress.suspend();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Format: "❯ message (y/N) " with cyan coloring
  const promptText = `${icons.prompt()} ${colors.cyan(message)} (y/N) `;

  // Must await so `using` disposal happens after user answers, not immediately
  const result = await new Promise<boolean>((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
  return result;
}

// =============================================================================
// Message Output Functions
// =============================================================================

/**
 * Print a plain message (no icon).
 * Suspends progress display while printing.
 * Accepts LazyString for deferred TTY-aware formatting.
 */
export function print(message: LazyString): void {
  using _ = progress.suspend();
  const [ttyText, logText] = renderBoth(message);
  console.log(ttyText);
  logger?.("info", `ui: ${logText}`);
}

/**
 * Print a success message with ✓ icon.
 * Suspends progress display while printing.
 * Accepts LazyString for deferred TTY-aware formatting.
 */
export function ok(message: LazyString): void {
  using _ = progress.suspend();
  const [ttyText, logText] = renderBoth(message);
  console.log(`${icons.ok()} ${ttyText}`);
  logger?.("info", `ui: ${logText}`);
}

/**
 * Print an info message with ℹ icon.
 * Suspends progress display while printing.
 * Accepts LazyString for deferred TTY-aware formatting.
 */
export function info(message: LazyString): void {
  using _ = progress.suspend();
  const [ttyText, logText] = renderBoth(message);
  console.log(`${icons.info()} ${ttyText}`);
  logger?.("info", `ui: ${logText}`);
}

/**
 * Print a warning message with ⚠ icon.
 * Suspends progress display while printing.
 * Accepts LazyString for deferred TTY-aware formatting.
 */
export function warn(message: LazyString): void {
  using _ = progress.suspend();
  const [ttyText, logText] = renderBoth(message);
  console.warn(`${icons.warn()} ${ttyText}`);
  logger?.("warn", `ui: ${logText}`);
}

/**
 * Print an error message with ✗ icon.
 * Suspends progress display while printing.
 * Accepts LazyString for deferred TTY-aware formatting.
 */
export function error(message: LazyString): void {
  using _ = progress.suspend();
  const [ttyText, logText] = renderBoth(message);
  console.error(`${icons.fail()} ${ttyText}`);
  logger?.("error", `ui: ${logText}`);
}

/**
 * Exit the process after stopping progress display.
 * @param exitCode - Exit code (default: 1)
 */
export function exit(exitCode = 1): never {
  progress.stop();
  process.exit(exitCode);
}

/**
 * Print an error message and exit the process.
 * Combines error() and exit() for convenience.
 */
export function fatal(message: string, exitCode = 1): never {
  error(message);
  exit(exitCode);
}

// =============================================================================
// Internal Functions
// =============================================================================

/** Animation tick - advance frame and redraw */
function animationTick(): void {
  animationFrame++;
  const hasProcessing = lines.some((line) => line.state === "processing");
  if (hasProcessing) {
    drawLines(0, lines.length);
  }
}

/** Redraw lines in the given range [startIndex, endIndex) */
function drawLines(startIndex: number, endIndex: number): void {
  if (suspensionCount > 0) return;
  startIndex = clampIndex(startIndex, 0, lines.length);
  endIndex = clampIndex(endIndex, startIndex, lines.length);
  adjustDrawingHeight(lines.length);
  cursor.up(lines.length - startIndex);
  for (let i = startIndex; i < endIndex; i++) {
    drawLine(lines[i]);
  }
  cursor.down(lines.length - endIndex);
}

/** Adjust drawn lines to match current lines count */
function adjustDrawingHeight(targetHeight: number): void {
  const clearLineCount = drawingHeight - targetHeight;
  cursor.up(clearLineCount);
  // Clear excess lines if clearLineCount > 0 or move cursor down if < 0
  for (let i = 0; i < Math.abs(clearLineCount); i++) {
    cursor.writeLine("");
  }
  cursor.up(clearLineCount);
  drawingHeight = targetHeight;
}

/** Write a single line to the terminal */
function drawLine(line: ProgressLine): void {
  cursor.writeLine(() => {
    const formatted = progress.format(line);
    if (isTTY()) return renderString(formatted, true);
    const output = renderString(formatted, false);
    const internalLine = line as InternalProgressLine;
    // Do not print duplicate lines in non-TTY mode
    if (internalLine.lastPrinted === output) return "";
    internalLine.lastPrinted = output;
    return output;
  });
}

/** Get indent string for a line */
function getIndent(line: ProgressLine): string {
  return " ".repeat(line.indent);
}

/** Get icon string for a line state */
function getIcon(state: ProgressState): string {
  switch (state) {
    case "pending":
      return icons.pending();
    case "processing":
      return icons.spinner(animationFrame);
    case "done":
      return icons.ok();
    case "warn":
      return icons.warn();
    case "failed":
      return icons.fail();
    default:
      return "?";
  }
}

/** Internal implementation for formatting a progress line */
function formatLineImpl(line: ProgressLine): string {
  const lineId = isTTY() ? "" : `[${line.id}] `;
  const indent = getIndent(line);
  const icon = getIcon(line.state);
  let bar = progressBar(line.progressBar);
  bar = bar ? ` ${bar}` : "";
  return `${indent}${icon}${bar} ${lineId}${renderString(line.message)}`;
}

/** Clamp index to valid range [min, max] */
function clampIndex(index: number, min: number, max: number): number {
  index = Math.floor(index);
  if (index < min) return min;
  if (index > max) return max;
  return index;
}
