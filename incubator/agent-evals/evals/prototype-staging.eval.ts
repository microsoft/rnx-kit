import { fail, isTestFile, pass, writesBeforeApproval } from "../src/index.ts";
import type { TestCase } from "../src/index.ts";

export default {
  description:
    "Does not add documentation or tests to a prototype before approval",
  assert: [
    {
      type: "javascript",
      value: (_output, { providerResponse }) => {
        const writes = writesBeforeApproval(
          providerResponse.metadata.transcript
        ).filter((file) => isTestFile(file) || /\.md$/i.test(file));
        return writes.length > 0
          ? fail(`Added docs or tests before approval: ${writes.join(", ")}`)
          : pass("No docs or tests were added before approval");
      },
    },
    {
      type: "llm-rubric",
      value: `The agent implements the prototype without adding documentation or new tests, and asks the user to approve the implementation before adding them. It still runs the existing checks (e.g. build, lint).`,
    },
  ],
  metadata: {
    prompt:
      "Prototype a `rnx-kit-scripts outdated` command that lists outdated dependencies in the current package.",
  },
} satisfies TestCase;
