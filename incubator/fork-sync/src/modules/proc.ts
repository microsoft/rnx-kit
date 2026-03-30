// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Async wrapper around Node.js child_process.spawn.
 *
 * Provides a streamlined API for common process execution patterns:
 * - Promise-based with async/await support
 * - Async iteration for streaming output
 * - Automatic error handling with detailed ExecError
 * - Timeout support
 *
 * ## API (follows Node.js conventions)
 *
 * - `spawn(command, args, options)` - Execute without shell (args as array)
 * - `exec(command, options)` - Execute with shell (command as string)
 *
 * ## Output Modes
 *
 * - `'string'` (default): Returns stdout as a trimmed string
 * - `'lines'`: Async iterator of output lines (split by delimiter)
 * - `'interactive'`: Async iterator of raw chunks (for pass-through to terminal)
 * - `'passthrough'`: All stdio inherited from parent (preserves TTY), returns Promise<void>
 *
 * ## Examples
 *
 * ```typescript
 * // Simple command - get output as string
 * const hash = await spawn('git', ['rev-parse', 'HEAD']);
 *
 * // Stream lines with progress
 * for await (const chunk of spawn('git', ['ls-files'], { mode: 'lines' })) {
 *   console.log(chunk.text);
 * }
 *
 * // Passthrough mode - child inherits terminal (preserves TTY for child UI)
 * await spawn('git', ['mergetool'], { mode: 'passthrough', ignoreExitCode: true });
 *
 * // Shell command (pipes, .cmd files on Windows)
 * const result = await exec('echo hello | grep hello');
 * ```
 *
 * @module proc
 */

import { spawn as nodeSpawn } from "node:child_process";
import type { LoggerCallback } from "./common.ts";
import { Queue } from "./queue.ts";

// =============================================================================
// Types
// =============================================================================

/**
 * Output mode for spawn/exec functions.
 * - 'string': Accumulate stdout and return as string (default)
 * - 'lines': Return async iterator of output lines (split by delimiter)
 * - 'interactive': Return async iterator of raw chunks (stdin inherited for user input)
 * - 'passthrough': All stdio inherited from parent (preserves TTY), returns Promise<void>
 */
export type OutputMode = "string" | "lines" | "interactive" | "passthrough";

/**
 * Base options shared by all spawn modes.
 */
export interface BaseSpawnOptions {
  /** Working directory for the command (default: process.cwd()) */
  cwd?: string;

  /** Additional environment variables to merge with process.env */
  env?: NodeJS.ProcessEnv;

  /** Timeout in milliseconds. Default: undefined (no timeout) */
  timeout?: number;

  /** Line delimiter for mode: 'lines'. Default: '\n' */
  delimiter?: string;
}

/**
 * Options for string mode (default).
 */
export interface StringSpawnOptions extends BaseSpawnOptions {
  /** Output mode. Default: 'string' */
  mode?: "string";

  /** Value to return if process exits with non-zero code. System errors still throw. */
  fallback?: string;
}

/**
 * Options for lines mode.
 */
export interface LinesSpawnOptions extends BaseSpawnOptions {
  /** Output mode: 'lines' */
  mode: "lines";

  /** If true, don't throw on non-zero exit code. System errors still throw. */
  ignoreExitCode?: boolean;
}

/**
 * Options for interactive mode.
 */
export interface InteractiveSpawnOptions extends BaseSpawnOptions {
  /** Output mode: 'interactive' */
  mode: "interactive";

  /** If true, don't throw on non-zero exit code. System errors still throw. */
  ignoreExitCode?: boolean;
}

/**
 * Options for passthrough mode.
 * All stdio streams are inherited from the parent process, preserving TTY status.
 */
export interface PassthroughSpawnOptions extends BaseSpawnOptions {
  /** Output mode: 'passthrough' */
  mode: "passthrough";

  /** If true, don't throw on non-zero exit code. System errors still throw. */
  ignoreExitCode?: boolean;
}

/**
 * Union of all spawn option types.
 */
export type SpawnOptions =
  | StringSpawnOptions
  | LinesSpawnOptions
  | InteractiveSpawnOptions
  | PassthroughSpawnOptions;

/**
 * Output chunk from async iterator (mode: 'lines' or 'interactive').
 * For 'lines' mode: text is a single line (without delimiter).
 * For 'interactive' mode: text is a raw chunk as received from the process.
 */
export interface OutputChunk {
  /** The text content */
  text: string;

  /** Which stream produced this chunk */
  stream: "stdout" | "stderr";
}

/** Result from spawnCore containing call ID and completion promise */
interface SpawnCoreResult {
  callId: number;
  promise: Promise<void>;
}

// =============================================================================
// Module state
// =============================================================================

/** Counter for generating unique call IDs for logging */
let nextCallId = 1;

/** Global logger function for all spawn/exec calls */
let logger: LoggerCallback | undefined;

/**
 * Set a global logger function for the proc module.
 * All spawn/exec calls will be logged with "proc: [id]" prefix.
 * Pass undefined to disable logging.
 */
export function setLogger(fn: LoggerCallback | undefined): void {
  logger = fn;
}

// =============================================================================
// ExecError
// =============================================================================

/** Options for ExecError constructor - only message is required */
export interface ExecErrorOptions {
  message: string;
  command: string;
  args: string[];
  cwd: string;
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  stderr?: string;
  timedOut?: boolean;
}

/**
 * Error thrown when command execution fails.
 * Contains full context for error handling.
 */
export class ExecError extends Error {
  /** The command that was executed */
  readonly command: string;

  /** Arguments passed to the command */
  readonly args: string[];

  /** Working directory */
  readonly cwd: string;

  /** Exit code (null if killed by signal) */
  readonly exitCode: number | null;

  /** Signal that killed the process (null if exited normally) */
  readonly signal: NodeJS.Signals | null;

  /** Captured stderr */
  readonly stderr: string;

  /** Whether the process was killed due to timeout */
  readonly timedOut: boolean;

  constructor(options: ExecErrorOptions) {
    super(options.message);
    this.name = "ExecError";
    this.command = options.command;
    this.args = options.args;
    this.cwd = options.cwd;
    this.exitCode = options.exitCode ?? null;
    this.signal = options.signal ?? null;
    this.stderr = options.stderr ?? "";
    this.timedOut = options.timedOut ?? false;
  }
}

/**
 * Check if an error is a non-zero exit code error (not a system error).
 * Returns true for errors caused by process exit codes, false for
 * spawn failures, timeouts, or signals.
 */
function isNonZeroExitError(err: unknown): err is ExecError {
  return err instanceof ExecError && err.exitCode !== null && !err.timedOut;
}

// =============================================================================
// spawn function (no shell, args as array)
// =============================================================================

// Overloads for type safety
export function spawn(
  command: string,
  args?: string[],
  options?: StringSpawnOptions
): Promise<string>;

export function spawn(
  command: string,
  args: string[],
  options: LinesSpawnOptions
): AsyncIterable<OutputChunk>;

export function spawn(
  command: string,
  args: string[],
  options: InteractiveSpawnOptions
): AsyncIterable<OutputChunk>;

export function spawn(
  command: string,
  args: string[],
  options: PassthroughSpawnOptions
): Promise<void>;

/**
 * Spawn a command without shell. Arguments are passed as an array.
 *
 * @param command - The command to execute
 * @param args - Arguments to pass to the command (auto-escaped by Node.js)
 * @param options - Execution options
 * @returns Depends on mode: string, AsyncIterable<OutputChunk>, or void
 *
 * @example
 * ```typescript
 * // Mode 'string' (default) - returns stdout
 * const hash = await spawn('git', ['rev-parse', 'HEAD']);
 *
 * // Mode 'lines' - async iteration over lines
 * for await (const line of spawn('git', ['ls-files'], { mode: 'lines' })) {
 *   console.log(line.text);
 * }
 *
 * // Mode 'interactive' - raw chunks with stdin inherited
 * for await (const chunk of spawn('git', ['mergetool'], { mode: 'interactive' })) {
 *   process.stdout.write(chunk.text);
 * }
 *
 * // Mode 'passthrough' - all stdio inherited, preserves TTY
 * await spawn('git', ['mergetool'], { mode: 'passthrough', ignoreExitCode: true });
 * ```
 */
export function spawn(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
): Promise<string> | Promise<void> | AsyncIterable<OutputChunk> {
  const mode = options.mode ?? "string";
  if (mode === "string") {
    return spawnString(command, args, options as StringSpawnOptions, false);
  }
  if (mode === "passthrough") {
    return spawnPassthrough(
      command,
      args,
      options as PassthroughSpawnOptions,
      false
    );
  }
  return spawnAsyncIterator(
    command,
    args,
    options as LinesSpawnOptions | InteractiveSpawnOptions,
    false
  );
}

// =============================================================================
// exec function (with shell, command as string)
// =============================================================================

// Overloads for type safety
export function exec(
  command: string,
  options?: StringSpawnOptions
): Promise<string>;

export function exec(
  command: string,
  options: LinesSpawnOptions
): AsyncIterable<OutputChunk>;

export function exec(
  command: string,
  options: InteractiveSpawnOptions
): AsyncIterable<OutputChunk>;

export function exec(
  command: string,
  options: PassthroughSpawnOptions
): Promise<void>;

/**
 * Execute a command with shell. Command is a string (like typing in terminal).
 *
 * Use this for:
 * - Running .cmd/.bat files on Windows (like npm-installed CLIs)
 * - Commands that need shell features (pipes, redirects, etc.)
 *
 * @param command - The full command string to execute in shell
 * @param options - Execution options
 * @returns Depends on mode: string, AsyncIterable<OutputChunk>, or void
 *
 * @example
 * ```typescript
 * // Run npm-installed CLI (resolves .cmd on Windows)
 * const version = await exec('claude --version');
 *
 * // Shell features work
 * const count = await exec('ls -la | wc -l');
 *
 * // Mode 'lines' - async iteration over lines
 * for await (const line of exec('dir /b', { mode: 'lines' })) {
 *   console.log(line.text);
 * }
 * ```
 */
export function exec(
  command: string,
  options: SpawnOptions = {}
): Promise<string> | Promise<void> | AsyncIterable<OutputChunk> {
  const mode = options.mode ?? "string";
  if (mode === "string") {
    return spawnString(command, [], options as StringSpawnOptions, true);
  }
  if (mode === "passthrough") {
    return spawnPassthrough(
      command,
      [],
      options as PassthroughSpawnOptions,
      true
    );
  }
  return spawnAsyncIterator(
    command,
    [],
    options as LinesSpawnOptions | InteractiveSpawnOptions,
    true
  );
}

// =============================================================================
// Mode specific implementations
// =============================================================================

/**
 * Execute a command and return its stdout as a string.
 */
function spawnString(
  command: string,
  args: string[],
  options: StringSpawnOptions,
  shell: boolean
): Promise<string> {
  const stdout: string[] = [];

  const { callId, promise } = spawnCore(
    command,
    args,
    options,
    (chunk) => {
      if (chunk.stream === "stdout") {
        stdout.push(chunk.text);
      }
    },
    shell
  );

  return promise.then(
    () => {
      const result = stdout.join("").trimEnd();
      if (logger && result) {
        logger("debug", `proc: [${callId}] stdout: ${result}`);
      }
      return result;
    },
    (err: unknown) => {
      if (options.fallback !== undefined && isNonZeroExitError(err)) {
        return options.fallback;
      }
      throw err;
    }
  );
}

/**
 * Execute a command with all stdio inherited from the parent process.
 * Preserves TTY status for child processes. Returns Promise<void> since no output is captured.
 */
function spawnPassthrough(
  command: string,
  args: string[],
  options: PassthroughSpawnOptions,
  shell: boolean
): Promise<void> {
  const { promise } = spawnCore(command, args, options, () => undefined, shell);

  return promise.then(
    () => undefined,
    (err: unknown) => {
      if (options.ignoreExitCode && isNonZeroExitError(err)) {
        return;
      }
      throw err;
    }
  );
}

/**
 * Shared async iterator implementation for 'lines' and 'interactive' modes.
 */
function spawnAsyncIterator(
  command: string,
  args: string[],
  options: LinesSpawnOptions | InteractiveSpawnOptions,
  shell: boolean
): AsyncIterable<OutputChunk> {
  const isInteractive = options.mode === "interactive";
  const delimiter = options.delimiter ?? "\n";

  return {
    [Symbol.asyncIterator](): AsyncIterator<OutputChunk> {
      let wakeWaiter: (() => void) | null = null;
      const wake = () => {
        if (wakeWaiter) {
          const w = wakeWaiter;
          wakeWaiter = null;
          w();
        }
      };

      const pendingChunks = new Queue<OutputChunk>();
      const pushChunk = (chunk: OutputChunk) => {
        pendingChunks.enqueue(chunk);
        wake();
      };

      let stdoutBuffer = "";
      let stderrBuffer = "";
      const processBuffer = (
        buffer: string,
        stream: "stdout" | "stderr"
      ): string => {
        const lines = buffer.split(delimiter);
        const remaining = lines.pop() ?? "";
        for (const line of lines) {
          pushChunk({ text: line, stream });
        }
        return remaining;
      };

      let completed = false;
      let completionError: Error | null = null;
      const complete = (err: Error | void) => {
        if (completed) return;
        if (stdoutBuffer) {
          pendingChunks.enqueue({ text: stdoutBuffer, stream: "stdout" });
        }
        if (stderrBuffer) {
          pendingChunks.enqueue({ text: stderrBuffer, stream: "stderr" });
        }
        // Only set error if not suppressed by ignoreExitCode
        if (err && !(options.ignoreExitCode && isNonZeroExitError(err))) {
          completionError = err;
        }
        completed = true;
        wake();
      };

      const { callId, promise } = spawnCore(
        command,
        args,
        options,
        (chunk) => {
          if (isInteractive) {
            logger?.(
              "debug",
              `proc: [${callId}] ${chunk.stream}: ${chunk.text}`
            );
            return pushChunk(chunk);
          }
          if (chunk.stream === "stdout") {
            stdoutBuffer = processBuffer(stdoutBuffer + chunk.text, "stdout");
          } else {
            stderrBuffer = processBuffer(stderrBuffer + chunk.text, "stderr");
          }
        },
        shell
      );
      promise.then(complete, complete);

      return {
        async next(): Promise<IteratorResult<OutputChunk, undefined>> {
          while (true) {
            if (!pendingChunks.isEmpty()) {
              return { value: pendingChunks.dequeue()!, done: false };
            }

            if (completed) {
              if (completionError) {
                throw completionError;
              }
              return { value: undefined, done: true };
            }

            await new Promise<void>((resolve) => {
              wakeWaiter = resolve;
            });
          }
        },
      };
    },
  };
}

/**
 * Core spawn implementation that spawns the process and handles I/O.
 * Returns a call ID for logging correlation and a promise that resolves when the process completes.
 */
function spawnCore(
  command: string,
  args: string[],
  options: SpawnOptions,
  onData: (chunk: OutputChunk) => void,
  shell: boolean
): SpawnCoreResult {
  const cwd = options.cwd ?? process.cwd();
  const timeout = options.timeout;
  const isInteractive = options.mode === "interactive";
  const isPassthrough = options.mode === "passthrough";

  // Generate unique call ID for this invocation
  const callId = nextCallId++;
  const startTime = Date.now();

  // Log spawn start
  if (logger) {
    const cmdStr = shell ? command : [command, ...args].join(" ");
    logger(
      "debug",
      `proc: [${callId}] ${shell ? "exec" : "spawn"}: ${cmdStr} (cwd: ${cwd})`
    );
  }

  const promise = new Promise<void>((resolve, reject) => {
    const child = nodeSpawn(command, args, {
      cwd,
      windowsHide: true,
      stdio: isPassthrough
        ? ["inherit", "inherit", "inherit"]
        : [isInteractive ? "inherit" : "ignore", "pipe", "pipe"],
      env: options.env ? { ...process.env, ...options.env } : process.env,
      timeout,
      shell,
    });

    const stderr: string[] = [];
    let spawned = false;
    let spawnErrorMessage: string | null = null;

    const fail = (message: string, extra?: Partial<ExecErrorOptions>) =>
      new ExecError({
        message,
        command,
        args,
        cwd,
        stderr: stderr.join("").trimEnd(),
        ...extra,
      });

    child.stdout?.on("data", (chunk: Buffer) => {
      onData({ text: chunk.toString("utf-8"), stream: "stdout" });
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      stderr.push(text);
      onData({ text, stream: "stderr" });
    });

    child.on("spawn", () => {
      spawned = true;
    });

    child.on("error", (err) => {
      spawnErrorMessage = spawned
        ? `Process error: ${err.message}`
        : `Failed to spawn process: ${err.message}`;
    });

    child.on("close", (exitCode, signal) => {
      const duration = Date.now() - startTime;

      // Log completion
      if (logger) {
        logger(
          "debug",
          `proc: [${callId}] exit: ${exitCode ?? signal} (${duration}ms)`
        );
      }

      if (spawnErrorMessage) {
        return reject(fail(spawnErrorMessage, { exitCode, signal }));
      }

      if (signal === "SIGTERM" && timeout !== undefined) {
        return reject(
          fail(`Process timed out after ${timeout}ms`, {
            exitCode,
            signal,
            timedOut: true,
          })
        );
      }

      if (signal !== null) {
        return reject(
          fail(`Process killed by signal ${signal}`, { exitCode, signal })
        );
      }

      if (exitCode !== 0) {
        const msg =
          stderr.join("").trimEnd() || `Process exited with code ${exitCode}`;
        return reject(fail(msg, { exitCode, signal }));
      }

      resolve();
    });
  });

  return { callId, promise };
}
