import type { TestCase } from "../src/index.ts";

export default {
  description: "Ignores the Dependency Dashboard issue when triaging",
  assert: [
    {
      type: "llm-rubric",
      value: `The agent triages issues and ignores the issue titled "Dependency Dashboard" (opened by Renovate). It does not triage that issue, nor list it as a bug, a feature request, or something that needs attention. Mentioning that it was skipped is fine.`,
    },
  ],
  metadata: {
    prompt:
      "Triage the open issues in microsoft/rnx-kit and tell me which ones need attention.",
  },
} satisfies TestCase;
