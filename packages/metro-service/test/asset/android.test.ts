import * as path from "path";
import {
  getAndroidAssetSuffix,
  getAssetDestPathAndroid,
} from "../../src/asset/android";

describe("getAndroidAssetSuffix", () => {
  test("returns 'ldpi' for scale 0.75", () => {
    expect(getAndroidAssetSuffix(0.75)).toEqual("ldpi");
  });

  test("returns 'mdpi' for scale 1", () => {
    expect(getAndroidAssetSuffix(1)).toEqual("mdpi");
  });

  test("returns 'hdpi' for scale 1.5", () => {
    expect(getAndroidAssetSuffix(1.5)).toEqual("hdpi");
  });

  test("returns 'xhdpi' for scale 2", () => {
    expect(getAndroidAssetSuffix(2)).toEqual("xhdpi");
  });

  test("returns 'xxhdpi' for scale 3", () => {
    expect(getAndroidAssetSuffix(3)).toEqual("xxhdpi");
  });

  test("returns 'xxxhdpi' for scale 4", () => {
    expect(getAndroidAssetSuffix(4)).toEqual("xxxhdpi");
  });

  test("returns 'ldpi' for scale 0.741", () => {
    expect(getAndroidAssetSuffix(0.741)).toEqual("ldpi");
  });

  test("returns 'ldpi' for scale 0.759", () => {
    expect(getAndroidAssetSuffix(0.759)).toEqual("ldpi");
  });

  test("returns 'ldpi' for scale 0.70", () => {
    expect(getAndroidAssetSuffix(0.7)).toEqual("ldpi");
  });

  test("returns 'mdpi' for scale 1.23", () => {
    expect(getAndroidAssetSuffix(1.23)).toEqual("mdpi");
  });
});

describe("getAssetDestPathAndroid", () => {
  test("should use the right destination folder", () => {
    const asset = {
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/test",
    };

    const expectDestPathForScaleToStartWith = (scale, location) => {
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
    const asset = {
      name: "Icon",
      type: "png",
      httpServerLocation: "/assets/App/Test",
    };

    expect(getAssetDestPathAndroid(asset, 1)).toBe(
      path.normalize("drawable-mdpi/app_test_icon.png")
    );
  });

  test("should remove `assets/` prefix", () => {
    const asset = {
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/RKJSModules/Apps/AndroidSample/Assets",
    };

    expect(getAssetDestPathAndroid(asset, 1).startsWith("assets_")).toBeFalsy();
  });

  test("should put non-drawable resources to `raw/`", () => {
    const asset = {
      name: "video",
      type: "mp4",
      httpServerLocation: "/assets/app/test",
    };

    expect(getAssetDestPathAndroid(asset, 1)).toBe(
      path.normalize("raw/app_test_video.mp4")
    );
  });

  test("should handle assets with a relative path outside of root", () => {
    const asset = {
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/../../test",
    };

    expect(getAssetDestPathAndroid(asset, 1)).toBe(
      path.normalize("drawable-mdpi/__test_icon.png")
    );
  });
});
