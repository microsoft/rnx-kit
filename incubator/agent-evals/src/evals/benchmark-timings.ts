import type { TestCase } from "../types.ts";

export const benchmarkTimings: TestCase = {
  description: "Reports fresh-process and warm timings separately",
  vars: {
    prompt:
      "Make `readPackage()` in `@rnx-kit/tools-node` faster and show how much faster it is.",
  },
  assert: [
    {
      type: "llm-rubric",
      value: `The agent benchmarks equivalent workloads before and after the change, and reports fresh-process (cold) and warm timings separately. It reports end-to-end improvements rather than substituting speedups of internal functions.`,
    },
  ],
};
