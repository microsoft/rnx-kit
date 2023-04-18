import type { PackagerAsset } from "../../src/asset/types";
import {
  getAndroidAssetSuffix,
  isApproximatelyEqual,
} from "../../src/asset/android";

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

  test("isApproximatelyEqual(1.25, 1.2499, tolerance=0.001) returns true", () => {
    expect(isApproximatelyEqual(1.25, 1.2499, 0.001)).toBe(true);
  });

  test("isApproximatelyEqual(1.25, 1.2499, tolerance=0.000001) returns false", () => {
    expect(isApproximatelyEqual(1.25, 1.2499, 0.000001)).toBe(false);
  });

  test("isApproximatelyEqual(10, 11, tolerance=2) returns true", () => {
    expect(isApproximatelyEqual(10, 11, 2)).toBe(true);
  });

  test("isApproximatelyEqual(10, 11, tolerance=0.5) returns false", () => {
    expect(isApproximatelyEqual(10, 11, 0.5)).toBe(false);
  });
});
