import { makeCommand } from "@rnx-kit/tools-shell";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fail } from "./assertions.ts";
import type { GradingResult, ProviderResponse, Transcript } from "./types.ts";

export type GraderOptions = {
  /** Model used by Copilot CLI to grade (default: Copilot CLI's default). */
  model?: string;
  /** Seconds to wait for the grader before failing (default: 300). */
  timeout?: number;
};

export const DEFAULT_GRADER_TIMEOUT = 300;

const DIFF_FILE = "changes.diff";
const INSTRUCTIONS_FILE = "instructions.md";
const TRANSCRIPT_FILE = "transcript.md";

// On Windows, npm installs Copilot CLI as a `.cmd` shim, which can only be run
// through a shell. Node does not quote arguments passed to a shell, so we quote
// them ourselves. They must not contain quotes, newlines or other shell syntax.
const IS_WINDOWS = process.platform === "win32";
const COPILOT = IS_WINDOWS ? "copilot.cmd" : "copilot";

export function formatTranscript({ entries }: Transcript): string {
  return entries
    .map((entry) => {
      if (entry.type === "message") {
        return `### ${entry.role.toUpperCase()}\n\n${entry.content}`;
      }

      const status =
        entry.success === undefined
          ? ""
          : entry.success
            ? " (ok)"
            : " (failed)";
      const result = entry.result ? `\n\n${entry.result}` : "";
      return `### TOOL ${entry.name}${status}\n\n${JSON.stringify(entry.arguments)}${result}`;
    })
    .join("\n\n");
}

function makeInstructions(rubric: string, hasDiff: boolean): string {
  return [
    "You grade transcripts of coding agent sessions against a rubric.",
    `Read the transcript in ${TRANSCRIPT_FILE} in this folder and grade it against the rubric below.`,
    ...(hasDiff
      ? [
          `The changes made during the session are in ${DIFF_FILE} in this folder, as a unified diff.`,
        ]
      : []),
    "Only consider what the transcript and the changes show.",
    "",
    "Rubric:",
    rubric,
    "",
    'Respond only with a JSON object: {"pass": boolean, "reason": string}',
  ].join("\n");
}

/**
 * Returns all top-level `{...}` blocks in the specified text. Braces inside
 * JSON strings are ignored.
 */
function findObjects(text: string): string[] {
  const objects: string[] = [];
  let depth = 0;
  let start = 0;
  let inString = false;
  for (let i = 0; i < text.length; ++i) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") {
        ++i;
      } else if (ch === '"') {
        inString = false;
      }
    } else if (ch === '"' && depth > 0) {
      inString = true;
    } else if (ch === "{") {
      if (depth++ === 0) {
        start = i;
      }
    } else if (ch === "}" && depth > 0 && --depth === 0) {
      objects.push(text.substring(start, i + 1));
    }
  }
  return objects;
}

/**
 * Parses the grader's response. The JSON object may be wrapped in other text,
 * e.g. a Markdown code block, which may also contain braces. The last object
 * with a boolean `pass` is used.
 */
export function parseResponse(response: string): GradingResult {
  const objects = findObjects(response);
  for (let i = objects.length - 1; i >= 0; --i) {
    try {
      const { pass, reason } = JSON.parse(objects[i]);
      if (typeof pass === "boolean") {
        return { pass, score: pass ? 1 : 0, reason };
      }
    } catch {
      // Not JSON; try the previous object
    }
  }
  return fail(`Grader returned an invalid response: ${response}`);
}

/**
 * Grades a session against a rubric using Copilot CLI. The instructions, the
 * transcript and the diff, if available, are written to files since the
 * transcript may exceed command line length limits, and the prompt must be safe
 * to pass through a shell on Windows. The grader can only read files in that
 * folder, and is killed if it does not finish within the timeout.
 */
export async function gradeRubric(
  rubric: string,
  { transcript, diff }: ProviderResponse["metadata"],
  { model, timeout = DEFAULT_GRADER_TIMEOUT }: GraderOptions = {}
): Promise<GradingResult> {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "agent-evals-"));
  try {
    fs.writeFileSync(
      path.join(cwd, INSTRUCTIONS_FILE),
      makeInstructions(rubric, Boolean(diff))
    );
    if (diff) {
      fs.writeFileSync(path.join(cwd, DIFF_FILE), diff);
    }
    fs.writeFileSync(
      path.join(cwd, TRANSCRIPT_FILE),
      formatTranscript(transcript)
    );

    const args = [
      "--prompt",
      `Follow the instructions in ${INSTRUCTIONS_FILE} in the current directory`,
      "--silent",
      "--no-ask-user",
      "--no-custom-instructions",
      "--disable-builtin-mcps",
      "--available-tools=view",
      "--allow-tool=view",
      `--add-dir=${cwd}`,
    ];
    if (model) {
      args.push(`--model=${model}`);
    }

    const copilot = makeCommand(COPILOT, { cwd, timeout: timeout * 1000 });
    const { status, stdout, stderr } = await copilot(
      ...(IS_WINDOWS ? args.map((arg) => `"${arg}"`) : args)
    );
    if (status === null) {
      return fail(`Grader timed out after ${timeout} s`);
    }
    if (status !== 0) {
      return fail(`Grader failed with exit code ${status}: ${stderr}`);
    }

    return parseResponse(stdout);
  } catch (e) {
    return fail(`Grader failed: ${e}`);
  } finally {
    fs.rmSync(cwd, { force: true, recursive: true });
  }
}
