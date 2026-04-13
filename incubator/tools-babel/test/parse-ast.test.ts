/**
 * Diagnostic test that finds structural AST differences between OXC and Babel
 * on a single simple non-comment JS fixture, reporting all differences.
 */
import { ok } from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { AnyNode } from "./analysis";
import { diffAst } from "./analysis";
import type { FileData } from "./fixtures";
import { getFixtures } from "./fixtures";

const fixtures = getFixtures();
const fileCache: Record<string, FileData> = {};

function getFile(file: string): FileData {
  if (!fileCache[file]) {
    fileCache[file] = fixtures.getFileData(file);
  }
  return fileCache[file];
}

describe("AST diff diagnostic", () => {
  let fixtures: ReturnType<typeof getFixtures>;

  before(() => {
    fixtures = getFixtures();
  });

  it("find all AST differences for non-comment JS fixtures", () => {
    const jsFiles = fixtures.files.filter(
      (f) =>
        (f.endsWith(".js") || f.endsWith(".jsx")) && !f.startsWith("comments-")
    );

    // collect per-category difference counts
    const diffCounts: Record<string, number> = {};
    let totalFiles = 0;
    let matchFiles = 0;
    let diffFiles = 0;

    for (const file of jsFiles) {
      const fileData = getFile(file);
      const babelAst = fileData.babelAst;
      if (!babelAst) continue;

      const oxcAst = fileData.oxcAst;
      if (!oxcAst) continue;
      totalFiles++;

      const diffs: string[] = [];
      diffAst(oxcAst, babelAst, "File", diffs, 50);

      if (diffs.length === 0) {
        matchFiles++;
      } else {
        diffFiles++;
        for (const d of diffs) {
          // categorize by the last property name in the path
          const match = d.match(/\.(\w+):/);
          const category = match ? match[1] : "other";
          diffCounts[category] = (diffCounts[category] || 0) + 1;
        }
      }
    }

    console.log(
      `\nAST comparison: ${matchFiles}/${totalFiles} exact match, ${diffFiles} with differences`
    );
    console.log("\nDifference categories (most common first):");
    const sorted = Object.entries(diffCounts).sort((a, b) => b[1] - a[1]);
    for (const [category, count] of sorted.slice(0, 20)) {
      console.log(`  ${category}: ${count}`);
    }

    // collect unique diff patterns (generalize paths to just field names)
    const patterns: Record<string, number> = {};
    const examples: Record<string, string> = {};
    for (const file of jsFiles) {
      const fileData = getFile(file);
      if (fileData.babelAst && fileData.oxcAst) {
        const diffs: string[] = [];
        diffAst(
          fileData.oxcAst as AnyNode,
          fileData.babelAst as AnyNode,
          "File",
          diffs,
          100
        );
        for (const d of diffs) {
          // normalize the path to just field/type pattern
          const normalized = d
            .replace(/\[\d+\]/g, "[]")
            .replace(/File\.program\.body\[\].*\./, "...");
          const key = normalized.slice(0, 120);
          patterns[key] = (patterns[key] || 0) + 1;
          if (!examples[key]) examples[key] = `${file}: ${d}`;
        }
      }
    }

    console.log("\nTop diff patterns:");
    const sortedPatterns = Object.entries(patterns).sort((a, b) => b[1] - a[1]);
    for (const [pattern, count] of sortedPatterns.slice(0, 25)) {
      console.log(`  [${count}x] ${pattern}`);
      console.log(`    e.g. ${examples[pattern]?.slice(0, 150)}`);
    }

    ok(true);
  });
});
