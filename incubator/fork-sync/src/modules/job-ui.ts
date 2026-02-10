// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * JobProgress - Progress reporting with parent-child job hierarchy.
 *
 * Provides a linear API for tracking job progress with automatic cleanup.
 * All output goes through tty-ui; use `setLogger()` for debug-level job
 * lifecycle logging (created, completed, interrupted).
 *
 * ## Architecture
 *
 * - **tty-ui**: Manages all terminal output (spinners, progress bars, messages)
 * - **setLogger()**: Optional debug logging for job lifecycle events
 * - **Console output**: Top-level job completions print to console via tty-ui
 *
 * ## Parent-Child Jobs
 *
 * Jobs can have children, forming a tree. Children are indented in the display.
 * When a parent completes, any active children are auto-completed as "interrupted"
 * and logged as warnings via the logger callback.
 *
 * @example
 * ```typescript
 * // Sequential steps (most common pattern)
 * using job = addJob('build', 'Building...');
 * job.step('Compiling sources...');
 * await compile();
 * const s = job.step('Linking...', { progressBar: 0 });
 * for (const file of files) {
 *   s.progress(++count / total);
 * }
 * job.done('Build complete');
 *
 * // Parent with explicit children (for parallel work)
 * using parent = addJob('merge', 'Merging files');
 * for (const file of files) {
 *   using child = parent.addChildJob(file.id, file.name);
 *   await processFile(file);
 *   child.done('merged');
 * }
 * parent.done('all files merged');
 *
 * // Complete with non-default state
 * job.done({ state: 'failed', message: 'Build error' });
 * ```
 *
 * @module job-ui
 */

import type { LazyString, LoggerCallback } from "./common.ts";
import type { ProgressLine, ProgressState } from "./tty-ui.ts";
import * as ui from "./tty-ui.ts";

// =============================================================================
// Constants
// =============================================================================

/** Default indent per level for child jobs */
const INDENT_PER_LEVEL = 2;

// =============================================================================
// Types
// =============================================================================

/** Options for creating a job */
export interface CreateOptions {
  /** Initial state (default: 'processing') */
  state?: ProgressState;
  /** Initial progress value 0-1 (undefined = no progress bar, spinner only) */
  progressBar?: number;
}

/** Options for updating a job (mirrors ProgressLineUpdate) */
export interface UpdateOptions {
  /** New state */
  state?: ProgressState;
  /** New message */
  message?: LazyString;
  /** New progress value 0-1 */
  progressBar?: number;
}

/**
 * Job progress instance.
 * Implements Disposable for automatic cleanup.
 */
export interface Job extends Disposable {
  /** Unique identifier */
  readonly id: string;

  /** Current message (same terminology as ProgressLine) */
  readonly message: LazyString;

  /** Parent job (if this is a child) */
  readonly parent?: Job;

  /**
   * Update the job's state, message, and/or progress bar.
   * @param options - Fields to update
   */
  update(options: UpdateOptions): void;

  /**
   * Update the job's message (shorthand for update({ message })).
   * @param message - New message text
   */
  update(message: LazyString): void;

  /**
   * Update the progress bar value (shorthand for update({ progressBar: value })).
   * @param value - Progress value 0-1
   */
  progress(value: number): void;

  /**
   * Create a sequential step as a child job.
   * Automatically completes the previous step (if any) created by step().
   * When the parent's done() is called, the active step is auto-completed.
   * Auto-generates ID as parentId:step-N.
   *
   * @param message - Step message to display
   * @param options - Optional settings (progressBar, state)
   * @returns The child Job for further updates
   */
  step(message: LazyString, options?: CreateOptions): Job;

  /**
   * Log info message (with [jobId] prefix).
   */
  info(message: LazyString): void;

  /**
   * Log warning (with [jobId] prefix).
   */
  warn(message: LazyString): void;

  /**
   * Log error (with [jobId] prefix).
   */
  error(message: LazyString): void;

  /**
   * Complete the job.
   * Removes the progress line from display.
   * Auto-completes any active children.
   * Prints completion output to console for top-level jobs.
   * @param options - Optional state/message/progressBar to set before completing
   */
  done(options: UpdateOptions): void;

  /**
   * Complete the job.
   * @param message - Optional final message (updates before removing)
   */
  done(message?: LazyString): void;

  /**
   * Create a child job.
   * Child is added after all existing children of this parent.
   * @param id - Unique identifier for the child
   * @param message - Initial message to display
   * @param options - Optional settings (progressBar)
   */
  addChildJob(id: string, message: LazyString, options?: CreateOptions): Job;

  /**
   * Get all child jobs (read-only view).
   */
  getChildJobs(): readonly Job[];
}

// =============================================================================
// Static API (exported functions)
// =============================================================================

/**
 * Create a new top-level job.
 * Jobs are added at the end of the list.
 *
 * @param id - Unique identifier for this job
 * @param message - Initial message to display
 * @param options - Optional settings (state, progressBar)
 */
export function addJob(
  id: string,
  message: LazyString,
  options?: CreateOptions
): Job {
  ensureUIStarted();

  const line = ui.progress.add(id, message, {
    indent: 0,
    state: options?.state,
    progressBar: options?.progressBar,
  });
  logger?.("debug", () => `job: created: ${ui.progress.format(line, false)}`);

  const job = new JobImpl(line, 0);
  topLevelJobs.push(job);
  return job;
}

/**
 * Get all top-level jobs (read-only view).
 */
export function getTopLevelJobs(): readonly Job[] {
  return topLevelJobs;
}

/**
 * Set a global logger function for the job-ui module.
 * Job lifecycle events will be logged with "job: [id]" prefix.
 * Pass undefined to disable logging.
 */
export function setLogger(fn: LoggerCallback | undefined): void {
  logger = fn;
}

/**
 * Reset module state (for testing).
 * @internal
 */
export function _resetForTesting(): void {
  stopUI();
  topLevelJobs.length = 0;
}

// =============================================================================
// Module globals
// =============================================================================

let uiSession: Disposable | null = null;
const topLevelJobs: JobImpl[] = [];
let logger: LoggerCallback | undefined;

// =============================================================================
// Job Implementation
// =============================================================================

class JobImpl implements Job {
  readonly line: ProgressLine;
  readonly parent?: JobImpl;
  readonly children: JobImpl[] = [];
  readonly depth: number;
  completed = false;
  private activeStep: JobImpl | null = null;
  private stepCounter = 0;

  constructor(line: ProgressLine, depth: number, parent?: JobImpl) {
    this.line = line;
    this.depth = depth;
    this.parent = parent;
  }

  get id(): string {
    return this.line.id;
  }

  get message(): LazyString {
    return this.line.message;
  }

  update(options: UpdateOptions): void;
  update(message: LazyString): void;
  update(optionsOrMessage: UpdateOptions | LazyString): void {
    if (this.completed) return;

    const opts: UpdateOptions =
      typeof optionsOrMessage === "string" ||
      typeof optionsOrMessage === "function"
        ? { message: optionsOrMessage }
        : optionsOrMessage;

    ui.progress.update(this.line, opts);
  }

  progress(value: number): void {
    this.update({ progressBar: value });
  }

  step(message: LazyString, options?: CreateOptions): Job {
    // Auto-complete previous step (only steps, not addChildJob children)
    if (this.activeStep && !this.activeStep.completed) {
      this.activeStep.done();
    }

    const id = `${this.id}:step-${++this.stepCounter}`;
    const child = this.addChildJob(id, message, options);
    this.activeStep = child as JobImpl;
    return child;
  }

  info(message: LazyString): void {
    ui.info(() => `[${this.id}] ${ui.renderString(message)}`);
  }

  warn(message: LazyString): void {
    ui.warn(() => `[${this.id}] ${ui.renderString(message)}`);
  }

  error(message: LazyString): void {
    ui.error(() => `[${this.id}] ${ui.renderString(message)}`);
  }

  done(options: UpdateOptions): void;
  done(message?: LazyString): void;
  done(optionsOrMessage?: UpdateOptions | LazyString): void {
    using _ = ui.progress.suspend();

    // Apply final state update (no redraw since suspended)
    const opts: UpdateOptions =
      (typeof optionsOrMessage === "string" ||
      typeof optionsOrMessage === "function"
        ? { message: optionsOrMessage }
        : optionsOrMessage) ?? {};
    const state =
      opts.state ?? (isDoneState(this.line.state) ? this.line.state : "done");
    ui.progress.update(this.line, { ...opts, state });

    if (!this.complete()) return;

    if (this.activeStep && !this.activeStep.completed) {
      this.activeStep.done();
    }

    for (const child of this.children) {
      child.doneAsInterrupted();
    }

    if (this.parent === undefined) {
      this.outputCompletion();
    }

    logger?.(
      "debug",
      () => `job: completed: ${ui.progress.format(this.line, false)}`
    );

    if (topLevelJobs.length === 0) {
      stopUI();
    }
  }

  private outputCompletion(): void {
    const msg: LazyString = () => {
      const lineId = ui.isTTY() ? "" : `[${this.id}] `;
      return `${lineId}${ui.renderString(this.line.message)}`;
    };
    switch (this.line.state) {
      case "failed":
        return ui.error(msg);
      case "warn":
        return ui.warn(msg);
      default:
        return ui.ok(msg);
    }
  }

  addChildJob(id: string, message: LazyString, options?: CreateOptions): Job {
    const childDepth = this.depth + 1;
    const indent = childDepth * INDENT_PER_LEVEL;

    const insertAfter = getLastDescendantOrSelf(this);
    const line = ui.progress.insertAfter(insertAfter.line, id, message, {
      indent,
      state: options?.state,
      progressBar: options?.progressBar,
    });
    logger?.(
      "debug",
      () =>
        `job: created (child of ${this.id}): ${ui.progress.format(line, false)}`
    );

    const child = new JobImpl(line, childDepth, this);
    this.children.push(child);
    return child;
  }

  getChildJobs(): readonly Job[] {
    return this.children;
  }

  [Symbol.dispose](): void {
    if (!this.completed) {
      this.done();
    }
  }

  /** Internal: Complete job as interrupted (when parent completes before child) */
  private doneAsInterrupted(): void {
    if (!this.complete()) return;

    for (const child of this.children) {
      child.doneAsInterrupted();
    }

    logger?.(
      "warn",
      () => `job: interrupted: ${ui.progress.format(this.line, false)}`
    );
  }

  private complete(): boolean {
    if (this.completed) return false;
    this.completed = true;

    ui.progress.remove(this.line);

    const parentList = this.parent?.children ?? topLevelJobs;
    const index = parentList.indexOf(this);
    if (index !== -1) {
      parentList.splice(index, 1);
    }
    return true;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function ensureUIStarted(): void {
  if (uiSession === null) {
    uiSession = ui.progress.start();
  }
}

function stopUI(): void {
  if (uiSession !== null) {
    uiSession[Symbol.dispose]();
    uiSession = null;
  }
}

/**
 * Find the last descendant in a job's subtree (for correct insertion ordering).
 * Returns the job itself if it has no children.
 */
function getLastDescendantOrSelf(job: JobImpl): JobImpl {
  if (job.children.length === 0) {
    return job;
  }
  const lastChild = job.children[job.children.length - 1];
  return getLastDescendantOrSelf(lastChild);
}

function isDoneState(state: ProgressState): boolean {
  return state === "done" || state === "warn" || state === "failed";
}
