import * as path from "node:path";
import { getAssetDestPath } from "../../src/asset/default";
import { makeAsset } from "./helper";

describe("getAssetDestPath", () => {
  test("should build correct path", () => {
    const asset = makeAsset({
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/test",
    });

    expect(getAssetDestPath(asset, 1)).toBe(
      path.normalize("assets/test/icon.png")
    );
  });

  test("should consider scale", () => {
    const asset = makeAsset({
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/test",
    });

    expect(getAssetDestPath(asset, 2)).toBe(
      path.normalize("assets/test/icon@2x.png")
    );
    expect(getAssetDestPath(asset, 3)).toBe(
      path.normalize("assets/test/icon@3x.png")
    );
  });

  test("should handle assets with a relative path outside of root", () => {
    const asset = makeAsset({
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/../../test",
    });

    expect(getAssetDestPath(asset, 1)).toBe(
      path.normalize("assets/__test/icon.png")
    );
  });
});
