import { polyfillAsyncIteratorSymbol } from "../src/polyfills";

describe("polyfillAsyncIteratorSymbol()", () => {
  test("returns empty string for non-Hermes targets", () => {
    expect(polyfillAsyncIteratorSymbol("es5")).toBeFalsy();
    expect(polyfillAsyncIteratorSymbol("es6")).toBeFalsy();
  });

  test("returns polyfill for Hermes targets", () => {
    expect(polyfillAsyncIteratorSymbol("hermes")).toBeTruthy();
    expect(polyfillAsyncIteratorSymbol("hermes0.7.0")).toBeTruthy();
    expect(polyfillAsyncIteratorSymbol("hermes0.12.0")).toBeTruthy();
  });

  test("returns polyfill if Hermes is one of the targets", () => {
    expect(polyfillAsyncIteratorSymbol(["es6", "hermes0.7.0"])).toBeTruthy();
  });
});
