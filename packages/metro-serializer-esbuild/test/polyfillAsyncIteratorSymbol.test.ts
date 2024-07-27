import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { polyfillAsyncIteratorSymbol } from "../src/polyfills";

describe("polyfillAsyncIteratorSymbol()", () => {
  const esbuild = {
    "0.18.8": { version: "0.18.8" }, // Lowering `async` generator functions introduced
    "0.19.5": { version: "0.19.5" },
    "0.19.6": { version: "0.19.6" }, // `Symbol.asyncIterator` introduced
  };

  it("returns empty string for non-Hermes targets", () => {
    ok(!polyfillAsyncIteratorSymbol(esbuild["0.18.8"], "es5"));
    ok(!polyfillAsyncIteratorSymbol(esbuild["0.18.8"], "es6"));

    ok(!polyfillAsyncIteratorSymbol(esbuild["0.19.5"], "es5"));
    ok(!polyfillAsyncIteratorSymbol(esbuild["0.19.5"], "es6"));

    ok(!polyfillAsyncIteratorSymbol(esbuild["0.19.6"], "es5"));
    ok(!polyfillAsyncIteratorSymbol(esbuild["0.19.6"], "es6"));
  });

  it("returns polyfill for Hermes targets", () => {
    ok(polyfillAsyncIteratorSymbol(esbuild["0.18.8"], "hermes"));
    ok(polyfillAsyncIteratorSymbol(esbuild["0.18.8"], "hermes0.7.0"));
    ok(polyfillAsyncIteratorSymbol(esbuild["0.18.8"], "hermes0.12.0"));

    ok(polyfillAsyncIteratorSymbol(esbuild["0.19.5"], "hermes"));
    ok(polyfillAsyncIteratorSymbol(esbuild["0.19.5"], "hermes0.7.0"));
    ok(polyfillAsyncIteratorSymbol(esbuild["0.19.5"], "hermes0.12.0"));

    ok(!polyfillAsyncIteratorSymbol(esbuild["0.19.6"], "hermes"));
    ok(!polyfillAsyncIteratorSymbol(esbuild["0.19.6"], "hermes0.7.0"));
    ok(!polyfillAsyncIteratorSymbol(esbuild["0.19.6"], "hermes0.12.0"));
  });

  it("returns polyfill if Hermes is one of the targets", () => {
    ok(polyfillAsyncIteratorSymbol(esbuild["0.18.8"], ["es6", "hermes0.7.0"]));
    ok(polyfillAsyncIteratorSymbol(esbuild["0.19.5"], ["es6", "hermes0.7.0"]));
    ok(!polyfillAsyncIteratorSymbol(esbuild["0.19.6"], ["es6", "hermes0.7.0"]));
  });
});
