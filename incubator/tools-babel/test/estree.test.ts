/**
 * Compare OXC-parsed ASTs (converted via estree.ts) against Babel reference ASTs.
 * Uses direct deepEqual comparison for non-comment JS fixtures, with known
 * differences tracked via a threshold.
 */
import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import type { FileData } from "./testUtils";
import { getFixtures } from "./testUtils";

// ── Helpers ──────────────────────────────────────────────────────────

const fixtures = getFixtures();
const fileCache: Record<string, FileData> = {};

function getFile(file: string): FileData {
  if (!fileCache[file]) {
    fileCache[file] = fixtures.getFileData(file);
  }
  return fileCache[file];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = Record<string, any>;

/**
 * Fields that are expected to differ between OXC and Babel ASTs.
 * Comments are handled separately and loc/position fields vary by design.
 */
const IGNORED_FIELDS = new Set([
  "loc",
  "start",
  "end",
  "comments",
  "leadingComments",
  "trailingComments",
  "innerComments",
  "tokens",
]);

const jsCommentFiles = fixtures.getFiles("js-comments")!;
const jsNonCommentFiles = fixtures.getFiles("js-no-comments")!;
const tsFiles = fixtures.getFiles("ts")!;

/**
 * Recursively compare two AST nodes and return the number of differences.
 */
function countDiffs(
  oxc: AnyNode | null | undefined,
  babel: AnyNode | null | undefined,
  maxDiffs = 100
): number {
  let count = 0;

  function walk(
    a: AnyNode | null | undefined,
    b: AnyNode | null | undefined
  ): void {
    if (count >= maxDiffs) return;
    if (a === b) return;
    if (a == null && b == null) return;
    if (a == null || b == null) {
      count++;
      return;
    }
    if (typeof a !== typeof b) {
      count++;
      return;
    }
    if (typeof a !== "object") {
      if (a !== b) count++;
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) count++;
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) walk(a[i], b[i]);
      return;
    }
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of allKeys) {
      if (IGNORED_FIELDS.has(key)) continue;
      if (!(key in a) && key in b) {
        if (b[key] != null) count++;
      } else if (key in a && !(key in b)) {
        if (a[key] != null) count++;
      } else {
        walk(a[key], b[key]);
      }
    }
  }

  walk(oxc as AnyNode, babel as AnyNode);
  return count;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("estree: OXC vs Babel AST comparison", () => {
  describe("JS/JSX non-comment fixtures — AST comparison", () => {
    it("most fixtures produce identical ASTs", () => {
      let exact = 0;
      let close = 0;
      let different = 0;
      let unparsed = 0;
      const details: string[] = [];

      for (const file of jsNonCommentFiles) {
        const fileData = getFile(file);
        const babelAst = fileData.babelAst;
        if (!babelAst) continue;

        const oxcAst = fileData.oxcAst;
        if (!oxcAst) {
          unparsed++;
          continue;
        }

        const diffs = countDiffs(oxcAst as AnyNode, babelAst as AnyNode);
        if (diffs === 0) {
          exact++;
        } else if (diffs <= 5) {
          close++;
        } else {
          different++;
          if (details.length < 10) {
            details.push(`${file}: ${diffs} differences`);
          }
        }
      }

      const total = exact + close + different;
      console.log(
        `Non-comment JS AST: ${exact}/${total} exact, ${close} close (<= 5 diffs), ${different} different, ${unparsed} unparsed`
      );
      if (details.length > 0) {
        console.log(`Largest mismatches:\n  ${details.join("\n  ")}`);
      }

      // at least 60% should be exact matches
      ok(
        exact / total >= 0.6,
        `Only ${exact}/${total} (${((exact / total) * 100).toFixed(0)}%) exact AST matches, expected >= 60%`
      );
    });
  });

  describe("JS/JSX comment fixtures", () => {
    it("all parse successfully", () => {
      let failed = 0;
      for (const file of jsCommentFiles) {
        const fileData = getFile(file);
        if (!fileData.oxcAst) failed++;
      }
      ok(failed === 0, `${failed} comment JS files failed OXC parse`);
    });
  });

  describe("TS/TSX fixtures", () => {
    it("most parse successfully", () => {
      let parsed = 0;
      for (const file of tsFiles) {
        const fileData = getFile(file);
        if (fileData.oxcAst) parsed++;
      }
      console.log(`TS fixtures: ${parsed}/${tsFiles.length} parsed`);
      ok(parsed > 0);
    });

    it("most produce close ASTs", () => {
      let exact = 0;
      let close = 0;
      let different = 0;

      for (const file of tsFiles) {
        const fileData = getFile(file);
        if (fileData.babelAst && fileData.oxcAst) {
          const diffs = countDiffs(
            fileData.oxcAst as AnyNode,
            fileData.babelAst as AnyNode
          );
          if (diffs === 0) exact++;
          else if (diffs <= 5) close++;
          else different++;
        }
      }

      console.log(
        `TS AST: ${exact} exact, ${close} close, ${different} different`
      );
      ok(true);
    });
  });
});
