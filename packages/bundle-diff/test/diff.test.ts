import { deepEqual, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { diff, isValidSourceMap, makeMap } from "../src/diff";
import { aSourceMap, bSourceMap } from "./mockSourceMaps";

describe("isValidSourceMap()", () => {
  it("returns true when an object resembles a source map", () => {
    ok(!isValidSourceMap({}));
    ok(!isValidSourceMap({ sources: [] }));
    ok(!isValidSourceMap({ sourcesContent: [] }));

    const badValue = "" as unknown as string[];
    const badSourceMap = { sources: badValue, sourcesContent: badValue };
    ok(!isValidSourceMap(badSourceMap));

    ok(isValidSourceMap({ sources: [], sourcesContent: [] }));
  });
});

describe("makeMap()", () => {
  it("creates a map of files with content", () => {
    deepEqual(makeMap(aSourceMap), {
      "/~/node_modules/querystring-es3/index.js": 127,
      "/~/node_modules/react-native/Libraries/Components/Picker/PickerAndroid.ios.js": 286,
      "/~/node_modules/react-native/Libraries/Components/Sound/SoundManager.js": 592,
      "/~/node_modules/react/index.js": 42,
      "/~/packages/awesome-app/lib/index.js": NaN,
    });
  });
});

describe("diff()", () => {
  it("returns empty array if one of the source maps is invalid", () => {
    deepEqual(diff({}, bSourceMap), []);
    deepEqual(diff(aSourceMap, {}), []);
    deepEqual(diff({}, {}), []);
  });

  it("returns empty array if there are no diffs", () => {
    deepEqual(diff(aSourceMap, aSourceMap), []);
  });

  it("returns files that differ between two bundles", () => {
    deepEqual(diff(aSourceMap, bSourceMap), [
      {
        diff: -127,
        path: "/~/node_modules/querystring-es3/index.js",
        state: "removed",
      },
      {
        diff: 1,
        path: "/~/node_modules/react/index.js",
        state: "changed",
      },
      {
        diff: -286,
        path: "/~/node_modules/react-native/Libraries/Components/Picker/PickerAndroid.ios.js",
        state: "removed",
      },
      {
        diff: -592,
        path: "/~/node_modules/react-native/Libraries/Components/Sound/SoundManager.js",
        state: "removed",
      },
      {
        diff: NaN,
        path: "/~/packages/awesome-app/lib/index.js",
        state: "added",
      },
      {
        diff: 106,
        path: "/~/node_modules/@babel/runtime/helpers/arrayWithHoles.js",
        state: "added",
      },
      {
        diff: 49,
        path: "/~/node_modules/@babel/runtime/regenerator/index.js",
        state: "added",
      },
      {
        diff: 96,
        path: "/~/node_modules/lodash-es/_realNames.js",
        state: "added",
      },
    ]);
  });
});
