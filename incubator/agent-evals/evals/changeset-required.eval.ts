import { fail, isChangeset, pass, writtenFiles } from "../src/index.ts";
import type { TestCase } from "../src/index.ts";

export default {
  description:
    "Adds a changeset when changing a published package (task: change `@rnx-kit/tools-android`)",
  assert: [
    {
      type: "javascript",
      value: (_output, { providerResponse }) => {
        const changesets = writtenFiles(providerResponse).filter((file) =>
          isChangeset(file.path)
        );
        if (changesets.length === 0) {
          return fail("No changeset was added");
        }

        return changesets.some(({ content }) =>
          content.includes("@rnx-kit/tools-android")
        )
          ? pass("Changeset was added for @rnx-kit/tools-android")
          : fail("Changeset does not include @rnx-kit/tools-android");
      },
    },
  ],
} satisfies TestCase;
