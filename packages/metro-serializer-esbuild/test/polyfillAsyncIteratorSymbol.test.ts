import { polyfillAsyncIteratorSymbol } from "../src/polyfills";

describe("polyfillAsyncIteratorSymbol()", () => {
  const esbuild = {
    "0.18.8": { version: "0.18.8" }, // Lowering `async` generator functions introduced
    "0.19.5": { version: "0.19.5" },
    "0.19.6": { version: "0.19.6" }, // `Symbol.asyncIterator` introduced
  };

  test("returns empty string for non-Hermes targets", () => {
    expect(polyfillAsyncIteratorSymbol(esbuild["0.18.8"], "es5")).toBeFalsy();
    expect(polyfillAsyncIteratorSymbol(esbuild["0.18.8"], "es6")).toBeFalsy();

    expect(polyfillAsyncIteratorSymbol(esbuild["0.19.5"], "es5")).toBeFalsy();
    expect(polyfillAsyncIteratorSymbol(esbuild["0.19.5"], "es6")).toBeFalsy();

    expect(polyfillAsyncIteratorSymbol(esbuild["0.19.6"], "es5")).toBeFalsy();
    expect(polyfillAsyncIteratorSymbol(esbuild["0.19.6"], "es6")).toBeFalsy();
  });

  test("returns polyfill for Hermes targets", () => {
    expect(
      polyfillAsyncIteratorSymbol(esbuild["0.18.8"], "hermes")
    ).toBeTruthy();
    expect(
      polyfillAsyncIteratorSymbol(esbuild["0.18.8"], "hermes0.7.0")
    ).toBeTruthy();
    expect(
      polyfillAsyncIteratorSymbol(esbuild["0.18.8"], "hermes0.12.0")
    ).toBeTruthy();

    expect(
      polyfillAsyncIteratorSymbol(esbuild["0.19.5"], "hermes")
    ).toBeTruthy();
    expect(
      polyfillAsyncIteratorSymbol(esbuild["0.19.5"], "hermes0.7.0")
    ).toBeTruthy();
    expect(
      polyfillAsyncIteratorSymbol(esbuild["0.19.5"], "hermes0.12.0")
    ).toBeTruthy();

    expect(
      polyfillAsyncIteratorSymbol(esbuild["0.19.6"], "hermes")
    ).toBeFalsy();
    expect(
      polyfillAsyncIteratorSymbol(esbuild["0.19.6"], "hermes0.7.0")
    ).toBeFalsy();
    expect(
      polyfillAsyncIteratorSymbol(esbuild["0.19.6"], "hermes0.12.0")
    ).toBeFalsy();
  });

  test("returns polyfill if Hermes is one of the targets", () => {
    expect(
      polyfillAsyncIteratorSymbol(esbuild["0.18.8"], ["es6", "hermes0.7.0"])
    ).toBeTruthy();
    expect(
      polyfillAsyncIteratorSymbol(esbuild["0.19.5"], ["es6", "hermes0.7.0"])
    ).toBeTruthy();
    expect(
      polyfillAsyncIteratorSymbol(esbuild["0.19.6"], ["es6", "hermes0.7.0"])
    ).toBeFalsy();
  });
});
