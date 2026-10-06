import { makeCommand } from "@rnx-kit/tools-shell";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fail } from "./assertions.ts";
import type { GradingResult, Transcript } from "./types.ts";

export type GraderOptions = {
  /** Model used by Copilot CLI to grade (default: Copilot CLI's default). */
  model?: string;
};

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

function makeInstructions(rubric: string): string {
  return [
    "You grade transcripts of coding agent sessions against a rubric.",
    `Read the transcript in ${TRANSCRIPT_FILE} in this folder and grade it against the rubric below.`,
    "Only consider what the transcript shows.",
    "",
    "Rubric:",
    rubric,
    "",
    'Respond only with a JSON object: {"pass": boolean, "reason": string}',
  ].join("\n");
}

/**
 * Parses the grader's response. The JSON object may be wrapped in other text,
 * e.g. a Markdown code block.
 */
export function parseResponse(response: string): GradingResult {
  const json = response.match(/\{[\s\S]*\}/)?.[0];
  if (!json) {
    return fail(`Grader returned an invalid response: ${response}`);
  }

  try {
    const { pass, reason } = JSON.parse(json);
    if (typeof pass !== "boolean") {
      return fail(`Grader returned an invalid response: ${json}`);
    }
    return { pass, score: pass ? 1 : 0, reason };
  } catch (e) {
    return fail(`Grader returned an invalid response: ${e}`);
  }
}

/**
 * Grades a transcript against a rubric using Copilot CLI. The instructions and
 * the transcript are written to files since the transcript may exceed command
 * line length limits, and the prompt must be safe to pass through a shell on
 * Windows. The grader can only read files in that folder.
 */
export async function gradeRubric(
  rubric: string,
  transcript: Transcript,
  { model }: GraderOptions = {}
): Promise<GradingResult> {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "agent-evals-"));
  try {
    fs.writeFileSync(
      path.join(cwd, INSTRUCTIONS_FILE),
      makeInstructions(rubric)
    );
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

    const copilot = makeCommand(COPILOT, { cwd });
    const { status, stdout, stderr } = await copilot(
      ...(IS_WINDOWS ? args.map((arg) => `"${arg}"`) : args)
    );
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
