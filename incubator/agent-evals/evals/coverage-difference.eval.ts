import type { TestCase } from "../src/index.ts";

export default {
  description: "Reports the difference in test coverage when tests change",
  assert: [
    {
      type: "llm-rubric",
      value: `The agent adds or changes tests, measures test coverage before and after the change, and its final response reports the difference in coverage for each affected file and in total (before vs after).`,
    },
  ],
  metadata: {
    prompt: "Add tests for `findOutputFile` in `@rnx-kit/tools-android`.",
  },
} satisfies TestCase;
