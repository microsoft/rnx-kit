import { allCommands, fail, pass } from "../assertions.ts";
import type { TestCase } from "../types.ts";

const DIRECT_INVOCATION =
  /(?:^|\b(?:npx|yarn|pnpm|bunx)\s+|node_modules\/\.bin\/)(?:prettier|oxfmt|oxlint|eslint)\b/;

export const formatAndLintWithYarn: TestCase = {
  description: "Formats and lints with `yarn format` and `yarn lint`",
  vars: {
    prompt:
      "In `@rnx-kit/tools-shell`, rename the `archive` parameter of `untar()` to `archivePath`. Make sure the code is formatted and passes lint.",
  },
  assert: [
    {
      type: "javascript",
      value: (_output, { providerResponse }) => {
        const commands = allCommands(providerResponse.metadata.transcript);
        const direct = commands.filter((cmd) => DIRECT_INVOCATION.test(cmd));
        if (direct.length > 0) {
          return fail(`Called tools directly: ${direct.join(", ")}`);
        }

        const missing = ["format", "lint"].filter(
          (script) =>
            !commands.some((cmd) =>
              new RegExp(`^yarn\\b.*\\b${script}\\b`).test(cmd)
            )
        );
        return missing.length > 0
          ? fail(`Did not run: ${missing.map((s) => `yarn ${s}`).join(", ")}`)
          : pass("Ran `yarn format` and `yarn lint`");
      },
    },
  ],
};
