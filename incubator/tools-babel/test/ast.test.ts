/**
 * Diagnostic test that finds structural AST differences between OXC and Babel
 * on a single simple non-comment JS fixture, reporting all differences.
 */
import { formatAsTable } from "@rnx-kit/tools-formatting";
import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import type { AnyNode } from "./analysis";
import { diffAst } from "./analysis";
import type { FileData } from "./fixtures";
import { getFixtures, getRealWorldFixtures } from "./fixtures";

const fileSets = ["js-no-comments", "js-comments", "ts", "realworld"] as const;

const fixtures = getFixtures();
const realWorldFixtures = getRealWorldFixtures();
const fileCache: Record<string, FileData> = {};
const closeThreshold = 5; // max number of differences to be considered "close"

function getFile(set: (typeof fileSets)[number], file: string): FileData {
  if (!fileCache[file]) {
    fileCache[file] =
      set === "realworld"
        ? realWorldFixtures.getFileData(file)
        : fixtures.getFileData(file);
  }
  return fileCache[file];
}

function getFiles(set: (typeof fileSets)[number]): string[] {
  return set === "realworld"
    ? realWorldFixtures.getFiles()
    : fixtures.getFiles(set);
}

function getSrc(set: (typeof fileSets)[number], file: string): string {
  return set === "realworld"
    ? realWorldFixtures.getSrc(file)
    : fixtures.getSrc(file);
}

describe("AST diff diagnostic", () => {
  it("can parse ASTs with oxc successfully", () => {
    type RowStats = [string, number, number, number, string, string, string];
    const columns = [
      "Type",
      "Total",
      "Failed OXC",
      "Failed Babel",
      "OXC Time",
      "Babel Time",
      "OXC Speed X",
    ];
    const stats: RowStats[] = [];

    for (const set of fileSets) {
      const files = getFiles(set);
      let totalFiles = 0;
      let failedOxc = 0;
      let failedBabel = 0;
      let oxcTime = 0;
      let babelTime = 0;

      if (!files) {
        throw new Error(`File set not found: ${set}`);
      }
      for (const filename of files) {
        const file = getFile(set, filename);
        // warm up source read
        getSrc(set, filename);
        totalFiles++; // total
        const startBabel = performance.now();
        const babelAst = file.babelAst;
        if (babelAst == null) failedBabel++;
        babelTime += performance.now() - startBabel;

        const startOxc = performance.now();
        const oxcAst = file.oxcAst;
        if (oxcAst == null) failedOxc++;
        oxcTime += performance.now() - startOxc;
      }
      stats.push([
        set,
        totalFiles,
        failedOxc,
        failedBabel,
        oxcTime.toFixed(1),
        babelTime.toFixed(1),
        `${(babelTime / oxcTime).toFixed(1)}x`,
      ]);
    }
    console.log("AST Parsing Results:");
    console.log(formatAsTable(stats, { columns }));
    for (const [set, total, failedOxc, failedBabel] of stats) {
      ok(
        failedOxc === 0,
        `OXC failed to parse ${failedOxc}/${total} files in set ${set}`
      );
      ok(
        failedBabel === 0,
        `Babel failed to parse ${failedBabel}/${total} files in set ${set}`
      );
    }
  });

  it("find all AST differences for non-comment JS fixtures", () => {
    const astColumns = ["Type", "Total", "Exact", "Close", "Different"];
    const astStats: [string, number, number, number, number][] = [];
    const diffCounts: Record<string, number> = {};
    const patterns: Record<string, number> = {};
    const examples: Record<string, string> = {};

    for (const set of fileSets) {
      const files = getFiles(set);
      if (!files) {
        throw new Error(`File set not found: ${set}`);
      }
      let total = 0;
      let exact = 0;
      let close = 0;
      let different = 0;

      for (const filename of files) {
        const file = getFile(set, filename);
        const babelAst = file.babelAst;
        const oxcAst = file.oxcAst;
        if (!babelAst || !oxcAst) continue;

        total++;
        const diffs: string[] = [];
        diffAst(oxcAst as AnyNode, babelAst as AnyNode, "File", diffs);
        if (diffs.length === 0) {
          exact++;
        } else {
          if (diffs.length <= closeThreshold) {
            close++;
          } else {
            different++;
          }
          for (const d of diffs) {
            // categorize by the last property name in the path
            const match = d.match(/\.(\w+):/);
            const category = match ? match[1] : "other";
            diffCounts[category] = (diffCounts[category] || 0) + 1;

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
      astStats.push([set, total, exact, close, different]);
    }
    console.log("AST Comparison Results:");
    console.log(formatAsTable(astStats, { columns: astColumns }));

    console.log("\nDifference categories (most common first):");
    const sorted = Object.entries(diffCounts).sort((a, b) => b[1] - a[1]);
    for (const [category, count] of sorted.slice(0, 20)) {
      console.log(`  ${category}: ${count}`);
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
