import parseDiff from "parse-diff";
import { quote } from "shell-quote";
import { toAgentRun } from "./assertions.ts";
import type { AgentRun } from "./types.ts";

const LOCKFILE = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/;

/**
 * Replaces lockfile changes in a unified diff with a one-line summary.
 *
 * Lockfile diffs can be thousands of lines long and are mostly noise to a
 * grader; including them wastes tokens and may exceed the grader's context
 * window. If an eval ever needs the grader to see lockfile contents, add an
 * option to skip this.
 */
function summarizeLockfiles(diff: string): string {
  return diff
    .split(/^(?=diff --git )/m)
    .map((section) => {
      const [file] = parseDiff(section);
      const path = file?.to === "/dev/null" ? file.from : file?.to;
      if (!file || !path || !LOCKFILE.test(path)) {
        return section;
      }
      return `(${path}: ${file.additions} lines added, ${file.deletions} lines removed; omitted)\n`;
    })
    .join("");
}

/**
 * Formats an agent run for `llm-rubric` graders.
 */
export function forGrader(output: AgentRun | string): string {
  const { commands, toolCalls, diff, finalMessage } = toAgentRun(output);
  const commandList = commands.map(
    ({ argv, cwd }) => `[${cwd}] $ ${quote(argv)}`
  );
  const toolList = toolCalls.map(
    ({ name, arguments: args }) => `${name} ${JSON.stringify(args)}`
  );
  return [
    "## Commands",
    commandList.join("\n") || "(none)",
    "## Tool calls",
    toolList.join("\n") || "(none)",
    "## Diff",
    summarizeLockfiles(diff) || "(none)",
    "## Final message",
    finalMessage,
  ].join("\n\n");
}
