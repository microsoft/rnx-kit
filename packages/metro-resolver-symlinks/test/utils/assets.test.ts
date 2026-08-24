import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ResolutionContextCompat } from "../../src/types.ts";
import { isAssetFile } from "../../src/utils/assets.ts";

describe("isAssetFile", () => {
  it("uses `isAssetFile` if it exists", () => {
    const context = {
      isAssetFile: () => true,
    } as unknown as ResolutionContextCompat;
    equal(isAssetFile(context, "test.png"), true);
  });

  it("uses `assetExts` if it exists", () => {
    const context = {
      assetExts: new Set(["png"]),
      isAssetFile: () => false,
    } as unknown as ResolutionContextCompat;
    equal(isAssetFile(context, "test.png"), true);
  });

  it("resolves multipart extensions", () => {
    const context = {
      assetExts: new Set(["android.png"]),
    } as unknown as ResolutionContextCompat;
    equal(isAssetFile(context, "android.png"), false);
    equal(isAssetFile(context, "test.android.png"), true);
  });
});
