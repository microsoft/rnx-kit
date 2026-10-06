import { allCommands, fail, pass, type TestCase } from "../src/index.ts";

const DIRECT_INVOCATION =
  /^(?:(?:npx|yarn|pnpm|bunx)\s+)?(?:\S*node_modules\/\.bin\/)?(?:prettier|oxfmt|oxlint|eslint)\b/;

export default {
  description: "Formats and lints with `yarn format` and `yarn lint`",
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
} satisfies TestCase;
