/**
 * Diagnostic test that finds structural AST differences between OXC and Babel
 * on a single simple non-comment JS fixture, reporting all differences.
 */
import type { Node } from "@babel/core";
import { transformFromAstSync } from "@babel/core";
import { ok } from "node:assert/strict";
import path from "node:path";
import { before, describe, it } from "node:test";
import { getBabelConfig } from "../src/config";
import { initTransformerContext } from "../src/options";
import { oxcParseToAst } from "../src/parse";
import { tracePassthrough } from "../src/tracing";
import type { TransformerContext } from "../src/types";
import { createBabelTransformerArgs, getFixtures } from "./testUtils";

const fixtures = getFixtures();

function oxcParseAndTransform(filePath: string, src: string) {
  const args = createBabelTransformerArgs(filePath, src, {});
  const settings = { trace: tracePassthrough };
  const context = initTransformerContext<TransformerContext>(
    filePath,
    settings
  );
  const config = getBabelConfig(args, settings);
  if (!context || !config) return null;
  try {
    const ast = oxcParseToAst({ ...args, context, config });
    if (ast) {
      const result = transformFromAstSync(ast, src, config);
      return result?.ast ?? null;
    }
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = Record<string, any>;

/**
 * Compare two AST nodes recursively and collect differences.
 * Ignores loc, start, end, and comments fields.
 */
function diffAst(
  oxc: AnyNode | null | undefined,
  babel: AnyNode | null | undefined,
  nodePath: string,
  diffs: string[],
  maxDiffs = 30
): void {
  if (diffs.length >= maxDiffs) return;

  if (oxc === babel) return;
  if (oxc == null && babel == null) return;

  if (oxc == null || babel == null) {
    diffs.push(
      `${nodePath}: oxc=${JSON.stringify(oxc)}, babel=${JSON.stringify(babel)}`
    );
    return;
  }

  if (typeof oxc !== typeof babel) {
    diffs.push(
      `${nodePath}: type mismatch oxc=${typeof oxc} babel=${typeof babel}`
    );
    return;
  }

  if (typeof oxc !== "object") {
    if (oxc !== babel) {
      diffs.push(
        `${nodePath}: oxc=${JSON.stringify(oxc)}, babel=${JSON.stringify(babel)}`
      );
    }
    return;
  }

  if (Array.isArray(oxc) && Array.isArray(babel)) {
    if (oxc.length !== babel.length) {
      diffs.push(
        `${nodePath}: array length oxc=${oxc.length}, babel=${babel.length}`
      );
    }
    const len = Math.min(oxc.length, babel.length);
    for (let i = 0; i < len; i++) {
      diffAst(oxc[i], babel[i], `${nodePath}[${i}]`, diffs, maxDiffs);
    }
    return;
  }

  // skip fields that are expected to differ
  const skip = new Set([
    "loc",
    "start",
    "end",
    "comments",
    "leadingComments",
    "trailingComments",
    "innerComments",
    "tokens",
  ]);

  const allKeys = new Set([...Object.keys(oxc), ...Object.keys(babel)]);
  for (const key of allKeys) {
    if (skip.has(key)) continue;
    if (!(key in oxc) && key in babel) {
      // babel has a field oxc doesn't
      const val = babel[key];
      // ignore undefined/null fields in babel
      if (val != null) {
        diffs.push(
          `${nodePath}.${key}: missing in oxc, babel=${JSON.stringify(val).slice(0, 80)}`
        );
      }
    } else if (key in oxc && !(key in babel)) {
      const val = oxc[key];
      if (val != null) {
        diffs.push(
          `${nodePath}.${key}: extra in oxc=${JSON.stringify(val).slice(0, 80)}`
        );
      }
    } else {
      diffAst(oxc[key], babel[key], `${nodePath}.${key}`, diffs, maxDiffs);
    }
  }
}

describe("Transformed AST diff diagnostic", () => {
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
    let babelFailed = 0;

    for (const file of jsFiles) {
      let babelAst: ReturnType<typeof fixtures.getTransformedAst> | null = null;
      try {
        babelAst = fixtures.getTransformedAst(file);
      } catch {
        babelFailed++;
        continue;
      }
      if (!babelAst) continue;

      const filePath = path.join(fixtures.dirLang, file);
      const src = fixtures.getSrc(file);
      const oxcAst = oxcParseAndTransform(filePath, src);
      if (!oxcAst) continue;
      totalFiles++;

      const diffs: string[] = [];
      diffAst(oxcAst as AnyNode, babelAst as AnyNode, "File", diffs, 50);

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
      const babelAst = fixtures.getAst(file);
      if (!babelAst) continue;
      const filePath = path.join(fixtures.dirLang, file);
      const oxcAst = oxcParseAndTransform(filePath);
      if (!oxcAst) continue;
      const diffs: string[] = [];
      diffAst(oxcAst as AnyNode, babelAst as AnyNode, "File", diffs, 100);
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

    console.log("\nTop diff patterns:");
    const sortedPatterns = Object.entries(patterns).sort((a, b) => b[1] - a[1]);
    for (const [pattern, count] of sortedPatterns.slice(0, 25)) {
      console.log(`  [${count}x] ${pattern}`);
      console.log(`    e.g. ${examples[pattern]?.slice(0, 150)}`);
    }
    console.log(`Babel parse failure: ${babelFailed} files`);

    ok(true);
  });
});
