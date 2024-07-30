import { equal, fail, ok } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { getAssetDestPathAndroid } from "../../src/asset/android";
import { makeAsset } from "./helper";

describe("getAssetDestPathAndroid", () => {
  it("should use the right destination folder", () => {
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
        fail(`asset for scale ${scale} should start with path '${location}'`);
      }
    };

    expectDestPathForScaleToStartWith(1, "drawable-mdpi");
    expectDestPathForScaleToStartWith(1.5, "drawable-hdpi");
    expectDestPathForScaleToStartWith(2, "drawable-xhdpi");
    expectDestPathForScaleToStartWith(3, "drawable-xxhdpi");
    expectDestPathForScaleToStartWith(4, "drawable-xxxhdpi");
  });

  it("should lowercase path", () => {
    const asset = makeAsset({
      name: "Icon",
      type: "png",
      httpServerLocation: "/assets/App/Test",
    });

    equal(
      getAssetDestPathAndroid(asset, 1),
      path.normalize("drawable-mdpi/app_test_icon.png")
    );
  });

  it("should remove `assets/` prefix", () => {
    const asset = makeAsset({
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/RKJSModules/Apps/AndroidSample/Assets",
    });

    ok(!getAssetDestPathAndroid(asset, 1).startsWith("assets_"));
  });

  it("should put non-drawable resources to `raw/`", () => {
    const asset = makeAsset({
      name: "video",
      type: "mp4",
      httpServerLocation: "/assets/app/test",
    });

    equal(
      getAssetDestPathAndroid(asset, 1),
      path.normalize("raw/app_test_video.mp4")
    );
  });

  it("should handle assets with a relative path outside of root", () => {
    const asset = makeAsset({
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/../../test",
    });

    equal(
      getAssetDestPathAndroid(asset, 1),
      path.normalize("drawable-mdpi/__test_icon.png")
    );
  });
});
