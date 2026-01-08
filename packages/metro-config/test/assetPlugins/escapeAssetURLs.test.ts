import type { AssetData } from "metro";
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  default as escapeAssetURL,
  restoreAssetURL,
} from "../../src/assetPlugins/escapeAssetURLs.js";

describe("assetPlugins/escapeRelativePaths", () => {
  const cases = [
    ["/assets/./node_modules", "/assets/./node_modules"],
    ["/assets/../node_modules", "/assets/@@/node_modules"],
    ["/assets/../../node_modules", "/assets/@@/@@/node_modules"],
    [
      "/assets/node_modules/../../react-native",
      "/assets/node_modules/@@/@@/react-native",
    ],
  ] as const;

  it("escapes `..` in URLs", () => {
    for (const [input, output] of cases) {
      const assetData = { httpServerLocation: input } as AssetData;
      equal(escapeAssetURL(assetData).httpServerLocation, output);
    }
  });

  it("unescapes `..` in URLs", () => {
    for (const [output, input] of cases) {
      equal(restoreAssetURL(input), output);
    }
  });
});
