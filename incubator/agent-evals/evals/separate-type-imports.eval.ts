import { fail, pass, writtenFiles } from "../src/index.ts";
import type { TestCase } from "../src/index.ts";

const TYPESCRIPT_FILE = /\.[cm]?tsx?$/;
const INLINE_TYPE_SPECIFIER =
  /\b(?:import|export)\s*\{[^}]*\btype\s+\w[^}]*\}\s*from\b/g;

export default {
  description:
    "Imports and re-exports types with separate `import type`/`export type` statements",
  assert: [
    {
      type: "javascript",
      value: (_output, { providerResponse }) => {
        const violations: string[] = [];
        for (const { path, content } of writtenFiles(providerResponse)) {
          if (!TYPESCRIPT_FILE.test(path)) {
            continue;
          }

          for (const match of content.matchAll(INLINE_TYPE_SPECIFIER)) {
            violations.push(`${path}: ${match[0].replace(/\s+/g, " ")}`);
          }
        }

        return violations.length > 0
          ? fail(`Inline type imports or re-exports: ${violations.join(", ")}`)
          : pass("No inline type imports or re-exports");
      },
    },
  ],
  metadata: { allSessions: true },
} satisfies TestCase;
