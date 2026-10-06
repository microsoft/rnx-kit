import { fail, isChangeset, pass, writtenFiles } from "../assertions.ts";
import type { TestCase } from "../types.ts";

export const noChangesetForIgnoredPackages: TestCase = {
  description: "Does not add a changeset when only ignored packages change",
  vars: {
    prompt:
      "In `@rnx-kit/test-app`, change the text shown on the start screen to `Welcome to rnx-kit`.",
  },
  assert: [
    {
      type: "javascript",
      value: (_output, { providerResponse }) => {
        const changesets = writtenFiles(providerResponse)
          .map((file) => file.path)
          .filter(isChangeset);
        return changesets.length > 0
          ? fail(`Unnecessary changesets: ${changesets.join(", ")}`)
          : pass("No changeset was added");
      },
    },
  ],
};
