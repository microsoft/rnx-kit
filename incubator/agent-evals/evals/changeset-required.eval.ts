import { fail, isChangeset, pass, writtenFiles } from "../src/index.ts";
import type { TestCase } from "../src/index.ts";

export default {
  description: "Adds a changeset when changing a published package",
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
  metadata: {
    prompt:
      "Make `getEmulators` in `@rnx-kit/tools-android` return an empty list instead of throwing when the emulator binary is missing.",
  },
} satisfies TestCase;
