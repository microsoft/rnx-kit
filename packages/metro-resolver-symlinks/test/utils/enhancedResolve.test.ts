import type { ResolutionContextCompat } from "../../src/types";
import { isAssetFile } from "../../src/utils/enhancedResolve";

describe("isAssetFile", () => {
  test("uses `isAssetFile` if it exists", () => {
    const context = {
      isAssetFile: () => true,
    } as unknown as ResolutionContextCompat;
    expect(isAssetFile(context, "test.png")).toBe(true);
  });

  test("uses `assetExts` if it exists", () => {
    const context = {
      assetExts: new Set(["png"]),
      isAssetFile: () => false,
    } as unknown as ResolutionContextCompat;
    expect(isAssetFile(context, "test.png")).toBe(true);
  });

  test("resolves multipart extensions", () => {
    const context = {
      assetExts: new Set(["android.png"]),
    } as unknown as ResolutionContextCompat;
    expect(isAssetFile(context, "android.png")).toBe(false);
    expect(isAssetFile(context, "test.android.png")).toBe(true);
  });
});
