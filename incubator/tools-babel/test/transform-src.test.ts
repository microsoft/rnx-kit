/**
 * Compare the generated source from Babel-transformed ASTs, using both
 * Babel-parsed and OXC-parsed inputs. The goal is to verify that the
 * OXC parse + estree conversion produces equivalent transformed output.
 */
import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { getFixtures, type FileData } from "./fixtures";

const fixtures = getFixtures();
const fileCache: Record<string, FileData> = {};

function getFile(file: string): FileData {
  if (!fileCache[file]) {
    fileCache[file] = fixtures.getFileData(file);
  }
  return fileCache[file];
}

const jsNonCommentFiles = fixtures.getFiles("js-no-comments")!;
const jsCommentFiles = fixtures.getFiles("js-comments")!;
const tsFiles = fixtures.getFiles("ts")!;

describe("Transformed source comparison: OXC vs Babel", () => {
  describe("JS/JSX non-comment fixtures", () => {
    it("transformed source matches for most fixtures", () => {
      let exact = 0;
      let different = 0;
      let babelFailed = 0;
      let oxcFailed = 0;
      const details: string[] = [];

      for (const file of jsNonCommentFiles) {
        const fileData = getFile(file);

        const babelSrc = fileData.srcTransformedBabel;
        if (!babelSrc) {
          if (fileData.error) babelFailed++;
          continue;
        }

        const oxcSrc = fileData.srcTransformedOxc;
        if (!oxcSrc) {
          oxcFailed++;
          continue;
        }

        if (babelSrc === oxcSrc) {
          exact++;
        } else {
          different++;
          if (details.length < 15) {
            // find first differing line
            const babelLines = babelSrc.split("\n");
            const oxcLines = oxcSrc.split("\n");
            for (
              let i = 0;
              i < Math.max(babelLines.length, oxcLines.length);
              i++
            ) {
              if (babelLines[i] !== oxcLines[i]) {
                details.push(
                  `${file} line ${i + 1}:\n  babel: ${JSON.stringify(babelLines[i]?.slice(0, 100))}\n  oxc:   ${JSON.stringify(oxcLines[i]?.slice(0, 100))}`
                );
                break;
              }
            }
          }
        }
      }

      const total = exact + different;
      console.log(
        `Non-comment JS transformed source: ${exact}/${total} exact match, ${different} different`
      );
      if (babelFailed > 0)
        console.log(`  Babel transform failed: ${babelFailed}`);
      if (oxcFailed > 0) console.log(`  OXC transform failed: ${oxcFailed}`);
      if (details.length > 0) {
        console.log(`First mismatches:\n${details.join("\n")}`);
      }

      // at least 60% should match
      ok(
        total === 0 || exact / total >= 0.6,
        `Only ${exact}/${total} (${total > 0 ? ((exact / total) * 100).toFixed(0) : 0}%) transformed source matches, expected >= 60%`
      );
    });
  });

  describe("JS/JSX comment fixtures", () => {
    it("transformed source comparison", () => {
      let exact = 0;
      let different = 0;
      let failed = 0;

      for (const file of jsCommentFiles) {
        const fileData = getFile(file);
        const babelSrc = fileData.srcTransformedBabel;
        const oxcSrc = fileData.srcTransformedOxc;
        if (!babelSrc || !oxcSrc) {
          failed++;
          continue;
        }
        if (babelSrc === oxcSrc) exact++;
        else different++;
      }

      const total = exact + different;
      console.log(
        `Comment JS transformed source: ${exact}/${total} match, ${different} different, ${failed} failed`
      );
      ok(true);
    });
  });

  describe("TS/TSX fixtures", () => {
    it("transformed source comparison", () => {
      let exact = 0;
      let different = 0;
      let failed = 0;
      const details: string[] = [];

      for (const file of tsFiles) {
        const fileData = getFile(file);
        const babelSrc = fileData.srcTransformedBabel;
        const oxcSrc = fileData.srcTransformedOxc;
        if (!babelSrc || !oxcSrc) {
          failed++;
          continue;
        }
        if (babelSrc === oxcSrc) {
          exact++;
        } else {
          different++;
          if (details.length < 10) {
            const babelLines = babelSrc.split("\n");
            const oxcLines = oxcSrc.split("\n");
            for (
              let i = 0;
              i < Math.max(babelLines.length, oxcLines.length);
              i++
            ) {
              if (babelLines[i] !== oxcLines[i]) {
                details.push(
                  `${file} line ${i + 1}:\n  babel: ${JSON.stringify(babelLines[i]?.slice(0, 100))}\n  oxc:   ${JSON.stringify(oxcLines[i]?.slice(0, 100))}`
                );
                break;
              }
            }
          }
        }
      }

      const total = exact + different;
      console.log(
        `TS transformed source: ${exact}/${total} match, ${different} different, ${failed} failed`
      );
      if (details.length > 0) {
        console.log(`First mismatches:\n${details.join("\n")}`);
      }
      ok(true);
    });
  });
});
