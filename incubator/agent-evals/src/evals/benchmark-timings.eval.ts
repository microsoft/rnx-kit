import type { TestCase } from "../index.ts";

export default {
  description: "Reports fresh-process and warm timings separately",
  assert: [
    {
      type: "llm-rubric",
      value: `The agent benchmarks equivalent workloads before and after the change, and reports fresh-process (cold) and warm timings separately. It reports end-to-end improvements rather than substituting speedups of internal functions.`,
    },
  ],
} satisfies TestCase;
