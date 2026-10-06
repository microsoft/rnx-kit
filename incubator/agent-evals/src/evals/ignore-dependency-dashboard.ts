import { fail, pass } from "../assertions.ts";
import type { TestCase } from "../types.ts";

export const ignoreDependencyDashboard: TestCase = {
  description: "Ignores the Dependency Dashboard issue when triaging",
  vars: {
    prompt:
      "Triage the open issues in microsoft/rnx-kit and list the ones that need attention.",
  },
  assert: [
    {
      type: "javascript",
      value: (output) => {
        // Mentioning it is fine as long as it is not listed as needing attention
        const listed = output
          .split("\n")
          .filter((line) => /dependency dashboard/i.test(line))
          .filter((line) => !/\b(ignor|skip|exclud|not a real)/i.test(line));
        return listed.length > 0
          ? fail(`Dependency Dashboard was triaged: ${listed.join(" / ")}`)
          : pass("Dependency Dashboard was not triaged");
      },
    },
  ],
};
