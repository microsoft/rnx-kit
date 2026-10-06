import { fail, isTestFile, pass, writtenFiles } from "../src/index.ts";
import type { TestCase } from "../src/index.ts";

const GLOBAL_OVERRIDE =
  /\b(?:process\.(?:platform|arch|env(?:\.\w+|\[[^\]]+\]))|(?:global|globalThis)\.(\w+))\s*=(?!=)|Object\.defineProperty\(\s*(?:process|global|globalThis)\b/g;

/**
 * Returns whether `global.require` is restored in `after()`, either to a saved
 * original or to `undefined` (it is not defined in ESM).
 */
function isRequireRestored(content: string): boolean {
  const saved = content.match(
    /\b(\w+)\s*=\s*(?:global|globalThis)\.require\b(?!\s*=)/
  );
  const original = saved ? `(?:undefined|${saved[1]})` : "undefined";
  const restore = new RegExp(
    String.raw`\bafter\([^]*?(?:\b(?:global|globalThis)\.require\s*=\s*${original}\b|\bdelete\s+(?:global|globalThis)\.require\b)`
  );
  return restore.test(content);
}

export default {
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
            // it is set in `before()`, and the original is restored in `after()`
            const isAllowed =
              match[1] === "require" &&
              path.endsWith(".mts") &&
              /\bbefore\(/.test(content) &&
              isRequireRestored(content);
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
} satisfies TestCase;
