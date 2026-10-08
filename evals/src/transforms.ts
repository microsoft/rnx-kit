import { toAgentRun } from "./assertions.ts";
import type { AgentRun } from "./types.ts";

/**
 * Formats an agent run for `llm-rubric` graders.
 */
export function forGrader(output: AgentRun | string): string {
  const { commands, toolCalls, diff, finalMessage } = toAgentRun(output);
  const commandList = commands.map(
    ({ command, cwd }) => `[${cwd}] $ ${command}`
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
    diff || "(none)",
    "## Final message",
    finalMessage,
  ].join("\n\n");
}
