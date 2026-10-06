import { fail, pass } from "../src/index.ts";
import type { TestCase } from "../src/index.ts";

export default {
  description: "Ignores the Dependency Dashboard issue when triaging",
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
} satisfies TestCase;
