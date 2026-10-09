import { readJSONFileSync } from "@rnx-kit/tools-filesystem";
import * as path from "node:path";
import parseDiff from "parse-diff";
import type {
  AgentChangedFile,
  AgentRun,
  AssertionContext,
  GradingResult,
} from "./types.ts";

export function result(failures: string[], success: string): GradingResult {
  const pass = failures.length === 0;
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass ? success : failures.join("\n"),
  };
}

/**
 * Returns the agent run, parsing it first if the provider returned JSON.
 * Throws if the output does not have the shape of an `AgentRun`.
 */
export function toAgentRun(output: AgentRun | string): AgentRun {
  const run = typeof output === "string" ? JSON.parse(output) : output;
  if (!run || typeof run !== "object") {
    throw new Error(`Expected agent run to be an object, got: ${run}`);
  }

  const invalid = [
    ...["commands", "toolCalls", "files"].filter(
      (key) => !Array.isArray(run[key])
    ),
    ...["diff", "finalMessage", "workdir"].filter(
      (key) => typeof run[key] !== "string"
    ),
  ];
  if (invalid.length > 0) {
    throw new Error(`Invalid agent run; check: ${invalid.join(", ")}`);
  }

  return run;
}

/**
 * Returns the line numbers added to each file in a unified diff.
 */
export function addedLines(diff: string): Map<string, Set<number>> {
  const result = new Map<string, Set<number>>();
  for (const file of parseDiff(diff)) {
    if (file.to && file.to !== "/dev/null") {
      const lines = new Set<number>();
      for (const chunk of file.chunks) {
        for (const change of chunk.changes) {
          if (change.type === "add") {
            lines.add(change.ln);
          }
        }
      }
      result.set(file.to, lines);
    }
  }
  return result;
}

export function requireConfig<T>({ config }: AssertionContext<T>): T {
  if (!config) {
    throw new Error("Missing assertion config");
  }
  return config;
}

export function existingFiles({ files }: AgentRun): AgentChangedFile[] {
  return files.filter((file) => file.status !== "deleted");
}

export function selectLines(
  file: AgentChangedFile,
  added?: Map<string, Set<number>>
): string {
  const content = file.content ?? "";
  if (!added) {
    return content;
  }

  const lines = added.get(file.path);
  return content
    .split("\n")
    .filter((_, i) => lines?.has(i + 1))
    .join("\n");
}

export function tryReadJSON(file: string) {
  try {
    return readJSONFileSync(file);
  } catch {
    return undefined;
  }
}

export function toRelativePath(workdir: string, p: string): string {
  return path.relative(workdir, p).split(path.sep).join("/") || ".";
}
