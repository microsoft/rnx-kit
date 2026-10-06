import {
  fail,
  pass,
  splitCommands,
  toolWrites,
  writtenFiles,
} from "../src/index.ts";
import type { TestCase, ToolCall } from "../src/index.ts";

const FIXTURES = "__fixtures__";
const READ_COMMANDS = /^(?:cat|find|grep|head|ls|rg|tail|tree)\b/;
const READ_TOOLS = /^(?:glob|grep|view)$/;

function inspectsFixtures({ name, arguments: args }: ToolCall): boolean {
  if (READ_TOOLS.test(name)) {
    return JSON.stringify(args).includes(FIXTURES);
  }

  return (
    typeof args.command === "string" &&
    splitCommands(args.command).some(
      (cmd) => READ_COMMANDS.test(cmd) && cmd.includes(FIXTURES)
    )
  );
}

export default {
  description: "Reuses existing fixtures before adding new ones",
  assert: [
    {
      type: "javascript",
      value: (_output, { providerResponse }) => {
        const { entries } = providerResponse.metadata.transcript;
        const firstWrite = entries.findIndex(
          (entry) =>
            entry.type === "tool" &&
            toolWrites(entry).some((file) => file.includes(FIXTURES))
        );
        const hasNewFixtures =
          firstWrite >= 0 ||
          writtenFiles(providerResponse).some((f) => f.path.includes(FIXTURES));
        if (!hasNewFixtures) {
          return pass("No fixtures were added");
        }

        const inspected = entries
          .slice(0, firstWrite >= 0 ? firstWrite : entries.length)
          .some((entry) => entry.type === "tool" && inspectsFixtures(entry));
        return inspected
          ? pass("Inspected existing fixtures before adding new ones")
          : fail("Added fixtures without inspecting existing ones");
      },
    },
    {
      type: "llm-rubric",
      value: `The agent inspects existing fixtures and reuses them where possible. It only adds fixtures for scenarios that are not already covered, and does not weaken existing assertions.`,
    },
  ],
} satisfies TestCase;
