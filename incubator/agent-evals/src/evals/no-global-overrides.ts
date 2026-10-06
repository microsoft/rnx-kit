import { fail, isTestFile, pass, writtenFiles } from "../assertions.ts";
import type { TestCase } from "../types.ts";

const GLOBAL_OVERRIDE =
  /\b(?:process\.(?:platform|arch|env(?:\.\w+|\[[^\]]+\]))|(?:global|globalThis)\.(\w+))\s*=(?!=)|Object\.defineProperty\(\s*(?:process|global|globalThis)\b/g;

export const noGlobalOverrides: TestCase = {
  description: "Does not override globals or system values in tests",
  assert: [
    {
      type: "javascript",
      value: (_output, { providerResponse }) => {
        const violations: string[] = [];
        for (const { path, content } of writtenFiles(providerResponse)) {
          if (!isTestFile(path)) {
            continue;
          }

          for (const match of content.matchAll(GLOBAL_OVERRIDE)) {
            // `global.require` may be set for sources loaded as ESM, as long as
            // it is set in `before()` and restored in `after()`
            const isAllowed =
              match[1] === "require" &&
              path.endsWith(".mts") &&
              /\bbefore\(/.test(content) &&
              /\bafter\(/.test(content);
            if (!isAllowed) {
              violations.push(`${path}: ${match[0]}`);
            }
          }
        }

        return violations.length > 0
          ? fail(`Globals overridden in tests: ${violations.join(", ")}`)
          : pass("No globals overridden in tests");
      },
    },
  ],
};
