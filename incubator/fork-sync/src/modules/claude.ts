// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Claude Code CLI invocation module for read-only AI operations.
 *
 * This module provides a clean interface for invoking Claude Code CLI in prompt
 * mode with prompt files. It enforces read-only mode by restricting
 * available tools to Read, Grep, and Glob only.
 *
 * ## Key Features
 *
 * - **Prompt file mode**: Prompts are saved to files and passed as CLI argument
 * - **Read-only mode**: Edit/Write/Bash tools are blocked by default
 * - **Verbose output**: Optional streaming event display for progress monitoring
 *   (uses stderr so it doesn't interfere with stdout results)
 * - **Callback support**: Progressive updates via onStreamEvent callback
 *
 * ## Usage
 *
 * ```typescript
 * import { invokeClaudeReadOnly } from './modules/claude.ts';
 *
 * const result = await invokeClaudeReadOnly({
 *   promptFile: '/path/to/prompt.md',
 *   cwd: '/path/to/repo',
 *   verbose: true,
 * });
 *
 * if (result.success) {
 *   console.log(result.result);
 * }
 * ```
 *
 * @module claude
 */

import { exec, ExecError } from "./proc.ts";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for invoking Claude in read-only prompt mode.
 */
export interface ClaudeInvokeOptions {
  /** Path to the prompt file (CLI will read it) */
  promptFile: string;

  /** Working directory for the Claude process (default: process.cwd()) */
  cwd?: string;

  /** Display streaming events to console for progress monitoring (default: false) */
  verbose?: boolean;

  /** Additional environment variables to pass to the process */
  env?: NodeJS.ProcessEnv;

  /** Optional model name to pass to Claude Code CLI */
  model?: string;

  /**
   * Tools to allow (default: ['Read', 'Grep', 'Glob'])
   * Only these tools will be available to the AI
   */
  allowedTools?: string[];

  /**
   * Timeout in milliseconds (default: 120000 = 2 minutes)
   * Maximum: 600000 = 10 minutes
   */
  timeout?: number;

  /**
   * Optional callback for progressive streaming updates.
   * Called for each parsed stream event.
   */
  onStreamEvent?: StreamEventCallback;
}

/**
 * Result from invoking Claude.
 */
export interface ClaudeInvokeResult {
  /** Whether the invocation succeeded (exit code 0) */
  success: boolean;

  /** The final result text from Claude's response */
  result: string;

  /** Exit code from the process (null if killed by signal) */
  exitCode: number | null;

  /** Signal that killed the process (null if exited normally) */
  signal: NodeJS.Signals | null;

  /** Error message if the invocation failed */
  error?: string;

  /** All parsed stream events (for debugging) */
  events?: ClaudeStreamEvent[];
}

/**
 * Claude streaming JSON event structure.
 * Based on --output-format stream-json output.
 */
export interface ClaudeStreamEvent {
  type: "system" | "assistant" | "user" | "result";
  subtype?: string;
  message?: {
    content?: {
      type: "text" | "tool_use" | "tool_result";
      text?: string;
      name?: string;
      input?: Record<string, unknown>;
    }[];
  };
  result?: string;
}

/**
 * Callback type for streaming event updates.
 */
export type StreamEventCallback = (
  event: ClaudeStreamEvent,
  formatted: string
) => void;

// =============================================================================
// Constants
// =============================================================================

/** Default read-only tools for AI operations */
export const DEFAULT_ALLOWED_TOOLS = ["Read", "Grep", "Glob"];

/** Default timeout: 2 minutes */
export const DEFAULT_TIMEOUT = 120000;

/** Maximum timeout: 10 minutes */
export const MAX_TIMEOUT = 600000;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse a single line of Claude streaming JSON output.
 *
 * @param line - Raw JSON line from stdout
 * @returns Parsed event or null if invalid
 */
export function parseStreamEvent(line: string): ClaudeStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as ClaudeStreamEvent;
    // Basic validation - must have a type field
    if (typeof parsed.type !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Format a Claude stream event for human-readable display.
 *
 * @param event - Parsed stream event
 * @returns Formatted string for console output
 */
export function formatStreamEvent(event: ClaudeStreamEvent): string {
  const MAX_INPUT_LENGTH = 60;

  switch (event.type) {
    case "system":
      if (event.subtype === "init") {
        return "[system] Session initialized";
      }
      return `[system] ${event.subtype ?? "unknown"}`;

    case "assistant":
      if (event.message?.content) {
        const parts: string[] = [];
        for (const item of event.message.content) {
          if (item.type === "text" && item.text) {
            parts.push(`[assistant] ${item.text}`);
          } else if (item.type === "tool_use" && item.name) {
            let inputSummary = "";
            if (item.input) {
              const inputStr = JSON.stringify(item.input);
              inputSummary =
                inputStr.length > MAX_INPUT_LENGTH
                  ? inputStr.slice(0, MAX_INPUT_LENGTH) + "..."
                  : inputStr;
            }
            parts.push(`[tool_use] ${item.name}(${inputSummary})`);
          }
        }
        return parts.join("\n");
      }
      return "[assistant] (no content)";

    case "result":
      if (event.result) {
        const preview =
          event.result.length > 100
            ? event.result.slice(0, 100) + "..."
            : event.result;
        return `[result] ${preview}`;
      }
      return "[result] (empty)";

    case "user":
      return "[user] (tool result)";

    default:
      return `[${event.type}] ${event.subtype ?? ""}`;
  }
}

/**
 * Create an error result with default values.
 *
 * @param error - Error message
 * @returns ClaudeInvokeResult with success=false
 */
function errorResult(error: string): ClaudeInvokeResult {
  return { success: false, result: "", exitCode: null, signal: null, error };
}

/**
 * Extract the final result from a list of stream events.
 *
 * @param events - All parsed stream events
 * @returns The result text or empty string if not found
 */
function extractResult(events: ClaudeStreamEvent[]): string {
  // Primary: Look for result event
  for (const event of events) {
    if (event.type === "result" && event.result) {
      return event.result;
    }
  }

  // Fallback: Concatenate assistant text messages
  const texts: string[] = [];
  for (const event of events) {
    if (event.type === "assistant" && event.message?.content) {
      for (const item of event.message.content) {
        if (item.type === "text" && item.text) {
          texts.push(item.text);
        }
      }
    }
  }
  return texts.join("\n");
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Invoke Claude Code CLI in prompt mode with prompt file.
 *
 * Enforces read-only mode by:
 * - Using --allowedTools to restrict to read-only tools
 * - Using --disallowedTools to block Edit, Write, Bash
 * - Passing prompt file path as CLI argument
 *
 * @param options - Configuration options
 * @returns Promise resolving to the invocation result
 *
 * @example
 * ```typescript
 * const result = await invokeClaudeReadOnly({
 *   promptFile: '/path/to/prompt.md',
 *   cwd: '/path/to/repo',
 *   verbose: true,
 * });
 *
 * if (result.success) {
 *   console.log('Claude says:', result.result);
 * }
 * ```
 */
export async function invokeClaudeReadOnly(
  options: ClaudeInvokeOptions
): Promise<ClaudeInvokeResult> {
  // Validate options
  if (!options.promptFile || options.promptFile.trim().length === 0) {
    return errorResult("Prompt file is required");
  }

  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  if (timeout < 0 || timeout > MAX_TIMEOUT) {
    return errorResult(`Timeout must be between 0 and ${MAX_TIMEOUT}ms`);
  }

  const allowedTools = options.allowedTools ?? DEFAULT_ALLOWED_TOOLS;
  const cwd = options.cwd ?? process.cwd();
  const verbose = options.verbose ?? false;

  // Build meta-prompt that references the prompt file
  const metaPrompt = `Read and follow the prompt in ${options.promptFile}`;

  // Build command string for shell execution
  // Note: -p is required for non-interactive mode, --verbose is required when using --output-format stream-json
  // IMPORTANT: The prompt MUST come BEFORE --allowedTools because --allowedTools is variadic
  // and will consume all following arguments as tool names
  // Quote arguments that may contain spaces
  const cmdParts = [
    "claude",
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
  ];

  if (options.model && options.model.trim().length > 0) {
    cmdParts.push("--model", options.model.trim());
  }

  // Add meta-prompt BEFORE --allowedTools (variadic option) - quote it for shell
  cmdParts.push(`"${metaPrompt}"`);

  // --allowedTools MUST be last as it consumes all following arguments
  cmdParts.push("--allowedTools", allowedTools.join(","));

  const command = cmdParts.join(" ");

  if (verbose) {
    console.error(`[claude] Command: ${command}`);
    console.error(`[claude] Working directory: ${cwd}`);
    console.error(`[claude] Prompt file: ${options.promptFile}`);
  }

  const events: ClaudeStreamEvent[] = [];
  let stderrBuffer = "";

  try {
    for await (const chunk of exec(command, {
      cwd,
      env: options.env,
      timeout,
      mode: "lines",
    })) {
      if (chunk.stream === "stdout") {
        // Parse JSON event from stdout line
        const event = parseStreamEvent(chunk.text);
        if (event) {
          events.push(event);
          const formatted = formatStreamEvent(event);

          if (verbose) {
            console.error(formatted);
          }

          if (options.onStreamEvent) {
            options.onStreamEvent(event, formatted);
          }
        }
      } else {
        // Accumulate stderr
        stderrBuffer += chunk.text + "\n";
        if (verbose) {
          console.error(chunk.text);
        }
      }
    }

    // Extract result from events
    const result = extractResult(events);

    return {
      success: true,
      result,
      exitCode: 0,
      signal: null,
      events,
    };
  } catch (e) {
    // Extract any result we got before the error
    const result = extractResult(events);

    if (e instanceof ExecError) {
      let error: string;
      if (e.timedOut) {
        error = `Process timed out after ${timeout}ms`;
      } else {
        error = e.stderr || stderrBuffer.trim() || e.message;
      }

      return {
        success: false,
        result,
        exitCode: e.exitCode,
        signal: e.signal,
        error,
        events,
      };
    }

    return {
      success: false,
      result,
      exitCode: null,
      signal: null,
      error: e instanceof Error ? e.message : String(e),
      events,
    };
  }
}
