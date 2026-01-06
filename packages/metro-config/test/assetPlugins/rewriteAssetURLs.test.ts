import type { AssetData } from "metro";
import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import rewriteRequest from "../../src/assetPlugins/rewriteAssetURLs.js";

describe("assetPluginForMonorepos/rewriteRequestWithQueryParam", () => {
  const cases = [
    ["/assets/./node_modules", "/assets/./node_modules"],
    ["/assets/../node_modules", "/assets?unstable_path=../node_modules"],
    ["/assets/../../node_modules", "/assets?unstable_path=../../node_modules"],
    [
      "/assets/node_modules/../../react-native",
      "/assets/node_modules/../../react-native",
    ],
    [
      "/assets/local/path/with/nested/assets/../../react-native",
      "/assets/local/path/with/nested/assets/../../react-native",
    ],
  ] as const;

  it("rewrites request URLs with relative paths", () => {
    for (const [input, output] of cases) {
      const assetData = { httpServerLocation: input } as AssetData;
      deepEqual(rewriteRequest(assetData), { httpServerLocation: output });
    }
  });
});
