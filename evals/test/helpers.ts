import type { AgentChangedFile, AgentRun } from "@rnx-kit/agent-evals";
import { fileURLToPath } from "node:url";

export const WORKSPACE = fileURLToPath(
  new URL("__fixtures__/workspace", import.meta.url)
);

export function makeRun(run: Partial<AgentRun> = {}): AgentRun {
  return {
    commands: [],
    toolCalls: [],
    files: [],
    diff: "",
    finalMessage: "",
    workdir: WORKSPACE,
    ...run,
  };
}

export function added(path: string, content: string): AgentChangedFile {
  return { path, status: "added", content };
}

/**
 * Returns a unified diff that adds the specified lines (1-based) of the file.
 */
export function diffAdding(
  { path, content = "" }: AgentChangedFile,
  lines?: number[]
): string {
  const all = content.split("\n");
  const body = all.map((line, i) =>
    !lines || lines.includes(i + 1) ? `+${line}` : ` ${line}`
  );
  const oldCount = body.filter((line) => line.startsWith(" ")).length;
  return [
    `diff --git a/${path} b/${path}`,
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -1,${oldCount} +1,${all.length} @@`,
    ...body,
    "",
  ].join("\n");
}
