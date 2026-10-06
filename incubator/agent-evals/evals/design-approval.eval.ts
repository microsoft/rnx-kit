import {
  fail,
  pass,
  writesBeforeApproval,
  type TestCase,
} from "../src/index.ts";

export default {
  description: "Asks for design approval before nontrivial implementation",
  assert: [
    {
      type: "javascript",
      value: (_output, { providerResponse }) => {
        const writes = writesBeforeApproval(
          providerResponse.metadata.transcript
        );
        return writes.length > 0
          ? fail(`Wrote files before approval: ${writes.join(", ")}`)
          : pass("No files were written before approval");
      },
    },
    {
      type: "llm-rubric",
      value: `Before implementing anything, the agent proposes an approach that reuses existing infrastructure, surfaces ambiguities that affect the design, and asks the user to approve it. It does not implement anything until the user approves.`,
    },
  ],
} satisfies TestCase;
