import { fail, isChangeset, pass, writtenFiles } from "../assertions.ts";
import type { TestCase } from "../types.ts";

export const changesetRequired: TestCase = {
  description: "Adds a changeset when changing a published package",
  vars: {
    prompt:
      "In `@rnx-kit/tools-android`, make `assemble()` accept an optional path to the Gradle wrapper instead of always using `./gradlew` or `gradlew.bat`.",
  },
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
};
