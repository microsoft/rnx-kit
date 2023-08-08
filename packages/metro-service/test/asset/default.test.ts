import * as path from "path";
import { getAssetDestPath } from "../../src/asset/default";

describe("getAssetDestPath", () => {
  test("should build correct path", () => {
    const asset = {
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/test",
    };

    expect(getAssetDestPath(asset, 1)).toBe(
      path.normalize("assets/test/icon.png")
    );
  });

  test("should consider scale", () => {
    const asset = {
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/test",
    };

    expect(getAssetDestPath(asset, 2)).toBe(
      path.normalize("assets/test/icon@2x.png")
    );
    expect(getAssetDestPath(asset, 3)).toBe(
      path.normalize("assets/test/icon@3x.png")
    );
  });

  test("should handle assets with a relative path outside of root", () => {
    const asset = {
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/../../test",
    };

    expect(getAssetDestPath(asset, 1)).toBe(
      path.normalize("assets/__test/icon.png")
    );
  });
});
