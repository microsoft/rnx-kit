/**
 * Real-world fixture tests: compare OXC-parsed ASTs and transformed output
 * against Babel reference for actual React Native component files.
 *
 * These fixtures contain patterns found in production RN code: TypeScript
 * interfaces, JSX components, hooks, native modules, theming, etc.
 */
import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { countDiffs, diffAst, type AnyNode } from "./analysis";
import { getRealWorldFixtures, type FileData } from "./fixtures";

const fixtures = getRealWorldFixtures();
const fileCache: Record<string, FileData> = {};

function getFile(file: string): FileData {
  return (fileCache[file] ??= fixtures.getFileData(file));
}

describe("Real-world fixtures", () => {
  describe("AST comparison", () => {
    it("all files parse with OXC", () => {
      let parsed = 0;
      let failed = 0;
      for (const file of fixtures.files) {
        const fd = getFile(file);
        if (fd.oxcAst) {
          parsed++;
        } else {
          failed++;
          console.log(`  FAIL parse: ${file}`);
        }
      }
      console.log(
        `Real-world parse: ${parsed}/${fixtures.files.length} succeeded`
      );
      equal(failed, 0, `${failed} files failed OXC parse`);
    });

    it("AST comparison per file", () => {
      for (const file of fixtures.files) {
        const fd = getFile(file);
        if (!fd.babelAst || !fd.oxcAst) continue;

        const diffs = countDiffs(
          fd.oxcAst as AnyNode,
          fd.babelAst as AnyNode
        );
        const diffDetails: string[] = [];
        if (diffs > 0) {
          diffAst(
            fd.oxcAst as AnyNode,
            fd.babelAst as AnyNode,
            "File",
            diffDetails,
            20
          );
        }

        const status = diffs === 0 ? "exact" : `${diffs} diffs`;
        console.log(`  ${file}: ${status}`);
        if (diffDetails.length > 0) {
          for (const d of diffDetails.slice(0, 5)) {
            console.log(`    ${d.slice(0, 120)}`);
          }
          if (diffDetails.length > 5) {
            console.log(`    ... and ${diffDetails.length - 5} more`);
          }
        }
      }
      ok(true);
    });
  });

  describe("Transformed source comparison", () => {
    it("transformed output per file", () => {
      let match = 0;
      let different = 0;
      let failed = 0;

      for (const file of fixtures.files) {
        const fd = getFile(file);
        const babelSrc = fd.srcTransformedBabel;
        const oxcSrc = fd.srcTransformedOxc;

        if (!babelSrc || !oxcSrc) {
          failed++;
          const reason = !babelSrc
            ? "babel transform failed"
            : "oxc transform failed";
          console.log(`  ${file}: ${reason}`);
          if (fd.error) {
            console.log(`    ${fd.error.message.slice(0, 120)}`);
          }
          continue;
        }

        if (babelSrc === oxcSrc) {
          match++;
          console.log(`  ${file}: MATCH`);
        } else {
          different++;
          // Report first few differing lines
          const bLines = babelSrc.split("\n");
          const oLines = oxcSrc.split("\n");
          let diffCount = 0;
          const diffSample: string[] = [];
          for (
            let i = 0;
            i < Math.max(bLines.length, oLines.length);
            i++
          ) {
            if (bLines[i] !== oLines[i]) {
              diffCount++;
              if (diffSample.length < 3) {
                diffSample.push(
                  `    L${i + 1} babel: ${JSON.stringify(bLines[i])?.slice(0, 80)}\n` +
                    `    L${i + 1} oxc:   ${JSON.stringify(oLines[i])?.slice(0, 80)}`
                );
              }
            }
          }
          console.log(
            `  ${file}: DIFF (${diffCount} lines differ out of ${Math.max(bLines.length, oLines.length)})`
          );
          for (const s of diffSample) console.log(s);
        }
      }

      const total = match + different;
      console.log(
        `\nReal-world transformed: ${match}/${total} match, ${different} different, ${failed} failed`
      );
      ok(true);
    });
  });
});
