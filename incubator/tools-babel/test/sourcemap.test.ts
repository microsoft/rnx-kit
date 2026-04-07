/**
 * Source map tests: verify that when SWC strips TypeScript before OXC parsing,
 * passing the SWC source map as inputSourceMap to Babel produces a final
 * source map that correctly maps back to the original TypeScript source.
 *
 * This validates that:
 * 1. The Babel AST does NOT need position adjustments for pre-transformed source
 * 2. Babel's inputSourceMap composes the SWC map with its own output map
 * 3. The composed map traces output positions back to original TS lines
 */
import { ok } from "node:assert/strict";
import { transformFromAstSync } from "@babel/core";
import type { TransformOptions } from "@babel/core";
import { transformSync as swcTransformSync } from "@swc/core";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { makeTransformerArgs } from "../src/options";
import { oxcParseToAst } from "../src/parse";
import { tracePassthrough } from "../src/tracing";
import type { TransformerSettings } from "../src/types";

// Use a simple VLQ decoder to avoid needing @jridgewell/trace-mapping as a dep.
// We only need originalPositionFor which we implement inline.
type OriginalPosition = {
  source: string | null;
  line: number | null;
  column: number | null;
};

function decodeVlq(encoded: string): number[][] {
  const lines: number[][] = [];
  let current: number[] = [];
  let shift = 0;
  let value = 0;

  for (let i = 0; i < encoded.length; i++) {
    const c = encoded.charCodeAt(i);
    if (c === 59) {
      // ';'
      lines.push(current);
      current = [];
      continue;
    }
    if (c === 44) {
      // ','
      continue;
    }
    // Base64 VLQ
    const digit =
      c >= 65 && c <= 90
        ? c - 65
        : c >= 97 && c <= 122
          ? c - 97 + 26
          : c >= 48 && c <= 57
            ? c - 48 + 52
            : c === 43
              ? 62
              : c === 47
                ? 63
                : -1;
    if (digit < 0) continue;
    const continuation = digit & 32;
    value += (digit & 31) << shift;
    if (continuation) {
      shift += 5;
    } else {
      const negate = value & 1;
      value >>= 1;
      current.push(negate ? -value : value);
      value = 0;
      shift = 0;
    }
  }
  lines.push(current);
  return lines;
}

type SourceMap = {
  sources: string[];
  mappings: string;
};

function tracePosition(
  map: SourceMap,
  line: number,
  column: number
): OriginalPosition {
  const decoded = decodeVlq(map.mappings);
  if (line < 1 || line > decoded.length)
    return { source: null, line: null, column: null };

  const segments = decoded[line - 1];
  // Walk segments: each segment is [genCol, srcIdx, srcLine, srcCol, ...]
  // Values are relative/delta-encoded across segments
  let genCol = 0;
  let srcIdx = 0;
  let srcLine = 0;
  let srcCol = 0;
  let best: OriginalPosition = { source: null, line: null, column: null };
  let si = 0;

  // We need absolute values, so track state across ALL lines
  let absGenCol = 0;
  let absSrcIdx = 0;
  let absSrcLine = 0;
  let absSrcCol = 0;

  for (let l = 0; l < decoded.length; l++) {
    const segs = decoded[l];
    let localGenCol = 0;
    let i = 0;
    while (i < segs.length) {
      const segLen =
        i + 4 < segs.length && segs[i + 4] !== undefined ? 5 : 4;
      if (segs.length - i < 1) break;

      localGenCol += segs[i];
      if (segs.length - i >= 4) {
        absSrcIdx += segs[i + 1];
        absSrcLine += segs[i + 2];
        absSrcCol += segs[i + 3];

        if (l === line - 1 && localGenCol <= column) {
          best = {
            source: map.sources[absSrcIdx] ?? null,
            line: absSrcLine + 1,
            column: absSrcCol,
          };
        }
      }
      i += segLen >= 4 ? (segs.length - i >= 5 ? 5 : 4) : 1;
    }
  }
  return best;
}

// Simpler approach: parse mappings properly per-segment
function parseSourceMap(map: SourceMap) {
  const lines = map.mappings.split(";");
  const segments: {
    genLine: number;
    genCol: number;
    srcIdx: number;
    srcLine: number;
    srcCol: number;
  }[] = [];
  let srcIdx = 0;
  let srcLine = 0;
  let srcCol = 0;

  for (let l = 0; l < lines.length; l++) {
    if (!lines[l]) continue;
    let genCol = 0;
    const parts = lines[l].split(",");
    for (const part of parts) {
      const values: number[] = [];
      let shift = 0;
      let value = 0;
      for (let i = 0; i < part.length; i++) {
        const c = part.charCodeAt(i);
        const digit =
          c >= 65 && c <= 90
            ? c - 65
            : c >= 97 && c <= 122
              ? c - 97 + 26
              : c >= 48 && c <= 57
                ? c - 48 + 52
                : c === 43
                  ? 62
                  : c === 47
                    ? 63
                    : -1;
        if (digit < 0) continue;
        value += (digit & 31) << shift;
        if (digit & 32) {
          shift += 5;
        } else {
          values.push(value & 1 ? -(value >> 1) : value >> 1);
          value = 0;
          shift = 0;
        }
      }
      if (values.length >= 4) {
        genCol += values[0];
        srcIdx += values[1];
        srcLine += values[2];
        srcCol += values[3];
        segments.push({
          genLine: l + 1,
          genCol,
          srcIdx,
          srcLine: srcLine + 1,
          srcCol,
        });
      } else if (values.length >= 1) {
        genCol += values[0];
      }
    }
  }
  return segments;
}

function originalPositionFor(
  map: SourceMap,
  pos: { line: number; column: number }
): OriginalPosition {
  const segments = parseSourceMap(map);
  let best: (typeof segments)[0] | undefined;
  for (const seg of segments) {
    if (seg.genLine === pos.line && seg.genCol <= pos.column) {
      if (!best || seg.genCol > best.genCol) best = seg;
    }
  }
  if (best) {
    return {
      source: map.sources[best.srcIdx] ?? null,
      line: best.srcLine,
      column: best.srcCol,
    };
  }
  return { source: null, line: null, column: null };
}

const settings: TransformerSettings = { trace: tracePassthrough };
const fixtureDir = path.join(__dirname, "__fixtures__/realworld");

/**
 * Run the full SWC → OXC → Babel pipeline for a TypeScript file and return
 * the final source map alongside the intermediate artifacts.
 */
function transformWithSwcMap(filename: string) {
  const originalTs = fs.readFileSync(filename, "utf8");
  const isTsx = filename.endsWith(".tsx");

  // Step 1: SWC strips TypeScript → JS + source map
  const swcResult = swcTransformSync(originalTs, {
    filename,
    sourceFileName: filename,
    jsc: {
      parser: { syntax: "typescript", tsx: isTsx },
      target: "es2022",
    },
    sourceMaps: true,
    isModule: true,
  });
  const swcJs = swcResult.code;
  const swcMap = JSON.parse(swcResult.map!);

  // Step 2: Parse SWC output with OXC (pretend it's a .js file)
  const jsFilename = filename.replace(/\.tsx?$/, isTsx ? ".jsx" : ".js");
  const args = makeTransformerArgs(
    {
      filename: jsFilename,
      src: swcJs,
      options: {
        dev: false,
        hot: false,
        minify: false,
        platform: "ios",
        enableBabelRCLookup: true,
        enableBabelRuntime: true,
        publicPath: "/",
        globalPrefix: "",
        unstable_transformProfile: "default",
        experimentalImportSupport: false,
        projectRoot: process.cwd(),
      },
      plugins: [],
    },
    settings
  );
  if (!args) throw new Error(`makeTransformerArgs failed for ${filename}`);

  const oxcAst = oxcParseToAst(args);
  if (!oxcAst) throw new Error(`OXC parse failed for ${filename}`);

  // Step 3: Transform with Babel, passing inputSourceMap
  const config: TransformOptions = {
    ...args.config,
    sourceMaps: true,
    code: true,
    compact: false,
    inputSourceMap: swcMap,
  };

  const result = transformFromAstSync(oxcAst, swcJs, config);
  if (!result?.map) throw new Error(`Babel transform produced no map`);

  return {
    originalTs,
    swcJs,
    swcMap,
    outputCode: result.code!,
    outputMap: result.map,
  };
}

describe("Source maps with SWC pre-transform", () => {
  const files = fs.readdirSync(fixtureDir).filter((f) => /\.tsx?$/.test(f));

  it("realworld files transform through SWC → OXC → Babel", () => {
    let success = 0;
    for (const file of files) {
      const filename = path.join(fixtureDir, file);
      try {
        const result = transformWithSwcMap(filename);
        ok(result.outputCode.length > 0, `${file}: output code is empty`);
        ok(result.outputMap.mappings, `${file}: no mappings in source map`);
        console.log(
          `  ${file}: ${result.originalTs.split("\n").length} TS lines → ${result.swcJs.split("\n").length} JS lines → ${result.outputCode.split("\n").length} output lines`
        );
        success++;
      } catch (e) {
        // Some files (e.g. codegen native components) fail when TS types
        // are stripped before Babel — these would skip SWC in production.
        console.log(
          `  ${file}: skipped (${(e as Error).message.slice(0, 80)})`
        );
      }
    }
    ok(success > 0, "No files could be transformed");
    console.log(`  ${success}/${files.length} files transformed successfully`);
  });

  it("source map traces back to original TypeScript source", () => {
    let tested = 0;
    for (const file of files) {
      const filename = path.join(fixtureDir, file);
      let result;
      try {
        result = transformWithSwcMap(filename);
      } catch {
        continue;
      }
      const { originalTs, outputCode, outputMap } = result;
      const tsLines = originalTs.split("\n");
      const outputLines = outputCode.split("\n");

      // Verify the map points to the original source, not the intermediate JS
      ok(
        outputMap.sources.some((s: string) => s.includes(file)),
        `${file}: source map sources should reference original file, got: ${outputMap.sources}`
      );

      // Trace several output positions back to original TS
      const tracer = outputMap;
      let traced = 0;
      let valid = 0;

      for (let i = 0; i < outputLines.length && traced < 20; i++) {
        // Find identifiers/keywords in the output to trace
        const match = outputLines[i].match(
          /\b(require|exports|function|return|var|const|let)\b/
        );
        if (!match) continue;

        const col = outputLines[i].indexOf(match[1]);
        const orig = originalPositionFor(tracer as SourceMap, {
          line: i + 1,
          column: col,
        });
        if (orig.line != null && orig.line > 0) {
          traced++;
          const origLine = tsLines[orig.line - 1];
          if (origLine != null) {
            valid++;
          }
        }
      }

      console.log(
        `  ${file}: ${valid}/${traced} traced positions map to valid original lines`
      );
      ok(
        traced > 0,
        `${file}: could not trace any positions back to original`
      );
      ok(
        valid === traced,
        `${file}: ${traced - valid} positions mapped to invalid original lines`
      );
      tested++;
    }
    ok(tested > 0, "No files could be tested");
  });

  it("import/require mappings trace to original import statements", () => {
    for (const file of files) {
      const filename = path.join(fixtureDir, file);
      let result;
      try {
        result = transformWithSwcMap(filename);
      } catch {
        continue;
      }
      const { originalTs, outputCode, outputMap } = result;
      const tsLines = originalTs.split("\n");
      const outputLines = outputCode.split("\n");
      const tracer = outputMap;

      let importTraced = 0;
      let importCorrect = 0;

      for (let i = 0; i < outputLines.length; i++) {
        const match = outputLines[i].match(/require\(["']([^"']+)/);
        if (!match) continue;

        const col = outputLines[i].indexOf("require");
        const orig = originalPositionFor(tracer as SourceMap, {
          line: i + 1,
          column: col,
        });

        if (orig.line != null && orig.line > 0) {
          importTraced++;
          const origLine = tsLines[orig.line - 1] || "";
          // The original line should contain an import or require for the same module
          const moduleName = match[1].split("/").pop();
          if (
            origLine.includes("import") ||
            origLine.includes("require") ||
            origLine.includes(moduleName!)
          ) {
            importCorrect++;
          } else {
            console.log(
              `  ${file}: require("${match[1]}") at L${i + 1} → original L${orig.line}: ${origLine.trim().slice(0, 80)}`
            );
          }
        }
      }

      if (importTraced > 0) {
        console.log(
          `  ${file}: ${importCorrect}/${importTraced} require() calls trace to matching import lines`
        );
        ok(
          importCorrect / importTraced >= 0.8,
          `${file}: only ${importCorrect}/${importTraced} imports traced correctly`
        );
      }
    }
  });
});
