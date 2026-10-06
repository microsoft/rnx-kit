import { allCommands, fail, pass } from "../src/index.ts";
import type { TestCase } from "../src/index.ts";

const YARN_TEST = /^yarn\s+(?:rnx-kit-scripts\s+)?test\s+(.+)$/;

export default {
  description:
    "Passes the test glob explicitly when passing arguments to `yarn test`",
  assert: [
    {
      type: "javascript",
      value: (_output, { providerResponse }) => {
        const commands = allCommands(providerResponse.metadata.transcript)
          .map((cmd) => cmd.match(YARN_TEST)?.[1])
          .filter((args): args is string => Boolean(args));
        if (commands.length === 0) {
          return fail("Did not run `yarn test` with arguments");
        }

        const missing = commands.filter(
          (args) => !/\btest\/|\.test\./.test(args)
        );
        return missing.length > 0
          ? fail(
              `No test files passed: yarn test ${missing.join(", yarn test ")}`
            )
          : pass("Test files were passed explicitly");
      },
    },
  ],
} satisfies TestCase;
