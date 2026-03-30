// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { exec, ExecError } from "./proc.ts";

export interface CopilotInvokeOptions {
  promptFile: string; // Path to prompt file (CLI will read it)
  cwd?: string;
  verbose?: boolean;
  env?: NodeJS.ProcessEnv;
  timeout?: number; // ms
  model?: string;
  /** Tools to allow (default: ['read', 'search']) */
  allowedTools?: string[];
}

/** Default read-only tools for AI operations */
export const DEFAULT_ALLOWED_TOOLS = ["read", "search"];

export interface CopilotInvokeResult {
  success: boolean;
  result: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  error?: string;
}

/** Default timeout: 2 minutes */
export const DEFAULT_TIMEOUT = 120000;

/** Maximum timeout: 10 minutes */
export const MAX_TIMEOUT = 600000;

export async function isCopilotInstalled(): Promise<boolean> {
  try {
    await exec("copilot --version");
    return true;
  } catch {
    return false;
  }
}

export async function invokeCopilotReadOnly(
  options: CopilotInvokeOptions
): Promise<CopilotInvokeResult> {
  if (!options.promptFile || options.promptFile.trim().length === 0) {
    return {
      success: false,
      result: "",
      exitCode: null,
      signal: null,
      error: "Prompt file is required",
    };
  }

  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  if (timeout <= 0 || timeout > MAX_TIMEOUT) {
    return {
      success: false,
      result: "",
      exitCode: null,
      signal: null,
      error: `Timeout must be between 1 and ${MAX_TIMEOUT} ms`,
    };
  }

  // Build meta-prompt that references the prompt file
  const metaPrompt = `Read and follow the prompt in ${options.promptFile}`;

  const allowedTools = options.allowedTools ?? DEFAULT_ALLOWED_TOOLS;

  // Build command string for shell execution
  // Quote arguments that contain spaces
  const cmdParts = ["copilot", "-p", `"${metaPrompt}"`];
  for (const tool of allowedTools) {
    cmdParts.push("--allow-tool", tool);
  }
  cmdParts.push("--silent");
  if (options.cwd) {
    cmdParts.push("--add-dir", `"${options.cwd}"`);
  }

  if (options.model && options.model.trim().length > 0) {
    cmdParts.push("--model", options.model.trim());
  }

  cmdParts.push("--no-ask-user"); // Disable the ask_user tool (agent works autonomously without asking questions)
  cmdParts.push("--no-auto-update"); // Disable downloading CLI update automatically
  cmdParts.push("--no-color"); // Disable all color output
  cmdParts.push("--no-custom-instructions"); // Disable loading of custom instructions from AGENTS.md and related files

  const command = cmdParts.join(" ");

  if (options.verbose) {
    console.error(`[copilot] Command: ${command}`);
    console.error(`[copilot] Working directory: ${options.cwd}`);
    console.error(`[copilot] Prompt file: ${options.promptFile}`);
  }

  let stdout = "";

  try {
    for await (const chunk of exec(command, {
      cwd: options.cwd,
      env: options.env,
      timeout,
      mode: "lines",
    })) {
      if (chunk.stream === "stdout") {
        stdout += chunk.text + "\n";
        if (options.verbose) {
          console.log(chunk.text);
        }
      } else if (options.verbose) {
        console.error(chunk.text);
      }
    }

    return {
      success: true,
      result: stdout.trimEnd(),
      exitCode: 0,
      signal: null,
    };
  } catch (e) {
    if (e instanceof ExecError) {
      return {
        success: false,
        result: stdout.trimEnd(),
        exitCode: e.exitCode,
        signal: e.signal,
        error: e.stderr || e.message,
      };
    }
    return {
      success: false,
      result: stdout.trimEnd(),
      exitCode: null,
      signal: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
