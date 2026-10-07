import type { TestCase } from "../../src/index.ts";

// Not named `*.eval.ts` so that it is not picked up as a real eval
export default {
  description: "Rubric only",
  assert: [{ type: "llm-rubric", value: "The agent says hello" }],
  metadata: { allSessions: true },
} satisfies TestCase;
