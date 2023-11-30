import { diff, isValidSourceMap, makeMap } from "../src/diff";
import { aSourceMap, bSourceMap } from "./mockSourceMaps";

describe("isValidSourceMap()", () => {
  test("returns true when an object resembles a source map", () => {
    expect(isValidSourceMap({})).toBe(false);
    expect(isValidSourceMap({ sources: [] })).toBe(false);
    expect(isValidSourceMap({ sourcesContent: [] })).toBe(false);

    const badValue = "" as unknown as string[];
    const badSourceMap = { sources: badValue, sourcesContent: badValue };
    expect(isValidSourceMap(badSourceMap)).toBe(false);

    expect(isValidSourceMap({ sources: [], sourcesContent: [] })).toBe(true);
  });
});

describe("makeMap()", () => {
  test("creates a map of files with content", () => {
    expect(makeMap(aSourceMap)).toMatchSnapshot();
  });
});

describe("diff()", () => {
  test("returns empty array if one of the source maps is invalid", () => {
    expect(diff({}, bSourceMap)).toEqual([]);
    expect(diff(aSourceMap, {})).toEqual([]);
    expect(diff({}, {})).toEqual([]);
  });

  test("returns empty array if there are no diffs", () => {
    expect(diff(aSourceMap, aSourceMap)).toEqual([]);
  });

  test("returns files that differ between two bundles", () => {
    expect(diff(aSourceMap, bSourceMap)).toMatchSnapshot();
  });
});
