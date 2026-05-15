/**
 * End-to-end test_app suite. For each permutation in test_app/permutations.mts
 * we spawn a fresh Metro bundle, then (if the permutation flags
 * `evaluate: true`) evaluate the bundle in a vm sandbox and assert that the
 * nodeapp public API responds with structurally-correct output.
 *
 * The suite is bundle-heavy; each permutation takes several seconds. Gate
 * via the `RNX_TEST_BUNDLES` env var so it stays out of the default
 * `yarn test` run unless explicitly requested.
 */
import { ok, equal } from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { evaluateBundle } from "./test_app/evaluateBundle.mts";
import { PERMUTATIONS } from "./test_app/permutations.mts";
import { runBundle } from "./test_app/runBundle.mts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "test_app", "dist");

const SHOULD_RUN = process.env.RNX_TEST_BUNDLES === "1";

describe(
  "test_app bundling permutations",
  { skip: SHOULD_RUN ? undefined : "set RNX_TEST_BUNDLES=1 to run" },
  () => {
    for (const perm of PERMUTATIONS) {
      describe(perm.id, () => {
        const bundleOut = `./dist/${perm.id}.bundle.js`;
        const absBundlePath = path.join(distDir, `${perm.id}.bundle.js`);

        it(
          "bundles successfully",
          { timeout: 120_000 },
          async () => {
            const result = await runBundle({ ...perm.options, bundleOut });
            if (!perm.evaluate) {
              // For permutations we expect may fail (e.g., baseline-only),
              // tolerate the failure but still surface the error message in
              // the assertion log for visibility.
              if (!result.success) {
                console.log(
                  `[${perm.id}] expected-non-evaluable bundle failed:`,
                  result.error?.message
                );
                return;
              }
            }
            ok(
              result.success,
              `bundle failed: ${result.error?.message ?? "(no error)"}`
            );
            ok(result.bytes && result.bytes > 0, "bundle should be non-empty");
            ok(result.bundlePath, "bundle path should be set");
          }
        );

        if (perm.evaluate) {
          it(
            "bundle evaluates and runApp returns structured output",
            { timeout: 30_000 },
            async () => {
              const evalResult = await evaluateBundle(absBundlePath);
              equal(typeof evalResult.nodeapp.runApp, "function");
              ok(evalResult.nodeapp.samples.length > 0);
              ok(evalResult.smallOutput, "small sample should yield output");
              const output = evalResult.smallOutput as Record<string, unknown>;
              ok("summary" in output, "output should have summary");
              ok("groups" in output, "output should have groups");
            }
          );
        }
      });
    }
  }
);
