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
        const findWrite = (predicate: (file: string) => boolean) =>
          entries.findIndex(
            (entry) =>
              entry.type === "tool" && toolWrites(entry).some(predicate)
          );
        let firstWrite = findWrite((file) => file.includes(FIXTURES));
        if (firstWrite < 0) {
          if (
            !writtenFiles(providerResponse).some((f) =>
              f.path.includes(FIXTURES)
            )
          ) {
            return pass("No fixtures were added");
          }

          // The fixtures were written by a command we cannot detect, e.g. a
          // script; they cannot have been written before the first write
          firstWrite = findWrite(() => true);
          if (firstWrite < 0) {
            return fail(
              "Added fixtures, but could not tell when; no file writes were found in the transcript"
            );
          }
        }

        const inspected = entries
          .slice(0, firstWrite)
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
