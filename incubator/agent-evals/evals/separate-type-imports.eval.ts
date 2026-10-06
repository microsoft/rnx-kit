import { fail, pass, writtenFiles } from "../src/index.ts";
import type { TestCase } from "../src/index.ts";

const TYPESCRIPT_FILE = /\.[cm]?tsx?$/;
const INLINE_TYPE_IMPORT = /\bimport\s*\{[^}]*\btype\s+\w[^}]*\}/g;

export default {
  description: "Imports types with separate `import type` statements",
  assert: [
    {
      type: "javascript",
      value: (_output, { providerResponse }) => {
        const violations: string[] = [];
        for (const { path, content } of writtenFiles(providerResponse)) {
          if (!TYPESCRIPT_FILE.test(path)) {
            continue;
          }

          for (const match of content.matchAll(INLINE_TYPE_IMPORT)) {
            violations.push(`${path}: ${match[0].replace(/\s+/g, " ")}`);
          }
        }

        return violations.length > 0
          ? fail(`Inline type imports: ${violations.join(", ")}`)
          : pass("No inline type imports");
      },
    },
  ],
} satisfies TestCase;
