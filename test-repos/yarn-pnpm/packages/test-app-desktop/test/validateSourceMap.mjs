#!/usr/bin/env node
// @ts-check

import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import * as assert from "assert";
import * as fs from "fs";

const findInSourceFile = (() => {
  /** @type {Record<string, string[]>} */
  const sourceMap = {};
  return (/** @type {string} */ sourcePath, /** @type {string} */ needle) => {
    if (!sourceMap[sourcePath]) {
      sourceMap[sourcePath] = fs
        .readFileSync(sourcePath, { encoding: "utf-8" })
        .split("\n");
    }

    const bundle = sourceMap[sourcePath];
    const lines = bundle.length;
    for (let i = 0; i < lines; ++i) {
      const column = bundle[i].indexOf(needle);
      if (column >= 0) {
        return { line: i + 1, column };
      }
    }

    return { line: -1, column: -1 };
  };
})();

const { [2]: bundlePath } = process.argv;
if (!bundlePath || !fs.existsSync(bundlePath)) {
  console.log(`usage: validateSourceMap.mjs /path/to/jsbundle`);
} else {
  const sourcemap = fs.readFileSync(bundlePath + ".map", { encoding: "utf-8" });
  const tracer = new TraceMap(JSON.parse(sourcemap));

  // TODO: This is probably not the best way to validate source maps, but I
  // couldn't find one that was up-to-date and didn't throw false positives.
  [
    { source: "src/App.native.tsx", needle: "function App(" },
    { source: "src/App.native.tsx", needle: "function Button(" },
    { source: "src/App.native.tsx", needle: "function DevMenu(" },
    { source: "src/App.native.tsx", needle: "function Feature(" },
    { source: "src/App.native.tsx", needle: "function Separator(" },
    { source: "src/App.native.tsx", needle: "function useStyles(" },
  ].forEach(({ source, needle }) => {
    assert.deepEqual(
      originalPositionFor(tracer, findInSourceFile(bundlePath, needle)),
      { source, name: null, ...findInSourceFile(source, needle) }
    );
  });
}
