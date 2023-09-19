import * as path from "node:path";
import { getAssetDestPathAndroid } from "../../src/asset/android";
import { makeAsset } from "./helper";

describe("getAssetDestPathAndroid", () => {
  test("should use the right destination folder", () => {
    const asset = makeAsset({
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/test",
    });

    const expectDestPathForScaleToStartWith = (
      scale: number,
      location: string
    ) => {
      if (!getAssetDestPathAndroid(asset, scale).startsWith(location)) {
        throw new Error(
          `asset for scale ${scale} should start with path '${location}'`
        );
      }
    };

    expectDestPathForScaleToStartWith(1, "drawable-mdpi");
    expectDestPathForScaleToStartWith(1.5, "drawable-hdpi");
    expectDestPathForScaleToStartWith(2, "drawable-xhdpi");
    expectDestPathForScaleToStartWith(3, "drawable-xxhdpi");
    expectDestPathForScaleToStartWith(4, "drawable-xxxhdpi");
  });

  test("should lowercase path", () => {
    const asset = makeAsset({
      name: "Icon",
      type: "png",
      httpServerLocation: "/assets/App/Test",
    });

    expect(getAssetDestPathAndroid(asset, 1)).toBe(
      path.normalize("drawable-mdpi/app_test_icon.png")
    );
  });

  test("should remove `assets/` prefix", () => {
    const asset = makeAsset({
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/RKJSModules/Apps/AndroidSample/Assets",
    });

    expect(getAssetDestPathAndroid(asset, 1).startsWith("assets_")).toBeFalsy();
  });

  test("should put non-drawable resources to `raw/`", () => {
    const asset = makeAsset({
      name: "video",
      type: "mp4",
      httpServerLocation: "/assets/app/test",
    });

    expect(getAssetDestPathAndroid(asset, 1)).toBe(
      path.normalize("raw/app_test_video.mp4")
    );
  });

  test("should handle assets with a relative path outside of root", () => {
    const asset = makeAsset({
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/../../test",
    });

    expect(getAssetDestPathAndroid(asset, 1)).toBe(
      path.normalize("drawable-mdpi/__test_icon.png")
    );
  });
});
