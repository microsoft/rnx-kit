import { fail, pass, writtenFiles } from "../assertions.ts";
import type { TestCase } from "../types.ts";

export const fixtureReuse: TestCase = {
  description: "Reuses existing fixtures before adding new ones",
  vars: {
    prompt:
      "Add a test for `findPackageDependencyDir()` in `@rnx-kit/tools-node` that resolves a scoped package.",
  },
  assert: [
    {
      type: "javascript",
      value: (_output, { providerResponse }) => {
        const { entries } = providerResponse.metadata.transcript;
        const firstWrite = entries.findIndex(
          (entry) =>
            entry.type === "tool" &&
            JSON.stringify(entry.arguments).includes("__fixtures__") &&
            /^(create|edit|apply_patch|str_replace_editor)$/.test(entry.name)
        );
        const hasNewFixtures =
          firstWrite >= 0 ||
          writtenFiles(providerResponse).some((f) =>
            f.path.includes("__fixtures__")
          );
        if (!hasNewFixtures) {
          return pass("No fixtures were added");
        }

        const inspected = entries
          .slice(0, firstWrite >= 0 ? firstWrite : entries.length)
          .some(
            (entry) =>
              entry.type === "tool" &&
              JSON.stringify(entry.arguments).includes("__fixtures__")
          );
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
};
