import type { PackagerAsset } from "../../src/asset/types";
import { getAndroidAssetSuffix } from "../../src/asset/android";

describe("MetroService", () => {
  const asset: PackagerAsset = {
    httpServerLocation: "https://my-server.com/assets",
    name: "logo",
    type: "jpg",
  };

  test("getAndroidAssetSuffix returns ldpi for scale 0.75", () => {
    expect(getAndroidAssetSuffix(asset, 0.75)).toEqual("ldpi");
  });

  test("getAndroidAssetSuffix returns mdpi for scale 1", () => {
    expect(getAndroidAssetSuffix(asset, 1)).toEqual("mdpi");
  });

  test("getAndroidAssetSuffix returns hdpi for scale 1.5", () => {
    expect(getAndroidAssetSuffix(asset, 1.5)).toEqual("hdpi");
  });

  test("getAndroidAssetSuffix returns xhdpi for scale 2", () => {
    expect(getAndroidAssetSuffix(asset, 2)).toEqual("xhdpi");
  });

  test("getAndroidAssetSuffix returns xxhdpi for scale 3", () => {
    expect(getAndroidAssetSuffix(asset, 3)).toEqual("xxhdpi");
  });

  test("getAndroidAssetSuffix returns xxxhdpi for scale 4", () => {
    expect(getAndroidAssetSuffix(asset, 4)).toEqual("xxxhdpi");
  });

  test("getAndroidAssetSuffix returns ldpi for scale 0.741", () => {
    expect(getAndroidAssetSuffix(asset, 0.741)).toEqual("ldpi");
  });

  test("getAndroidAssetSuffix returns ldpi for scale 0.759", () => {
    expect(getAndroidAssetSuffix(asset, 0.759)).toEqual("ldpi");
  });

  test("getAndroidAssetSuffix throw for invalid scale 0.70", () => {
    expect(() =>
      getAndroidAssetSuffix(asset, 0.7)
    ).toThrowErrorMatchingSnapshot();
  });

  test("getAndroidAssetSuffix throw for invalid scale 1.23", () => {
    expect(() =>
      getAndroidAssetSuffix(asset, 1.23)
    ).toThrowErrorMatchingSnapshot();
  });
});
