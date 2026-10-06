import { fail } from "./assertions.ts";
import type { GradingResult, Transcript } from "./types.ts";

const DEFAULT_API = "https://models.github.ai/inference";
const DEFAULT_MODEL = "openai/gpt-4.1";
const MAX_RESULT_LENGTH = 1000;

const SYSTEM_PROMPT = `You grade transcripts of coding agent sessions against a rubric.
Only consider what the transcript shows. Respond with a JSON object:
{"pass": boolean, "reason": string}`;

function truncate(text: string, length: number): string {
  return text.length > length ? text.substring(0, length) + " [...]" : text;
}

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
      const result = entry.result
        ? `\n\n${truncate(entry.result, MAX_RESULT_LENGTH)}`
        : "";
      return `### TOOL ${entry.name}${status}\n\n${JSON.stringify(entry.arguments)}${result}`;
    })
    .join("\n\n");
}

/**
 * Grades a transcript against a rubric using GitHub Models (or any
 * OpenAI-compatible chat completions API).
 */
export async function gradeRubric(
  rubric: string,
  transcript: Transcript
): Promise<GradingResult> {
  const token =
    process.env["EVALS_GRADER_TOKEN"] || process.env["GITHUB_TOKEN"];
  if (!token) {
    return fail("Set EVALS_GRADER_TOKEN or GITHUB_TOKEN to grade rubrics");
  }

  const api = process.env["EVALS_GRADER_API"] || DEFAULT_API;
  const response = await fetch(`${api}/chat/completions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env["EVALS_GRADER_MODEL"] || DEFAULT_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `## Rubric\n\n${rubric}\n\n## Transcript\n\n${formatTranscript(transcript)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return fail(`Grader failed: ${response.status} ${await response.text()}`);
  }

  const { choices } = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  try {
    const { pass, reason } = JSON.parse(choices[0].message.content);
    return { pass: pass === true, score: pass === true ? 1 : 0, reason };
  } catch (e) {
    return fail(`Grader returned an invalid response: ${e}`);
  }
}
