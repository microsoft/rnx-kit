import type { TestCase } from "../types.ts";

export const coverageDifference: TestCase = {
  description: "Reports the difference in test coverage when tests change",
  vars: {
    prompt:
      "Add tests for the uncovered code paths in `packages/tools-node/src/path.ts`.",
  },
  assert: [
    {
      type: "llm-rubric",
      value: `The agent adds or changes tests, measures test coverage before and after the change, and its final response reports the difference in coverage for each affected file and in total (before vs after).`,
    },
  ],
};
