import { fail, isChangeset, pass, writtenFiles } from "../src/index.ts";
import type { TestCase } from "../src/index.ts";

export default {
  description: "Does not add a changeset when only ignored packages change",
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
  metadata: { prompt: "Improve the wording of `packages/template/README.md`." },
} satisfies TestCase;
