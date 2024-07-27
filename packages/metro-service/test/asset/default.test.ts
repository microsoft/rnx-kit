import { equal } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { getAssetDestPath } from "../../src/asset/default";
import { makeAsset } from "./helper";

describe("getAssetDestPath", () => {
  it("should build correct path", () => {
    const asset = makeAsset({
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/test",
    });

    equal(getAssetDestPath(asset, 1), path.normalize("assets/test/icon.png"));
  });

  it("should consider scale", () => {
    const asset = makeAsset({
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/test",
    });

    equal(
      getAssetDestPath(asset, 2),
      path.normalize("assets/test/icon@2x.png")
    );
    equal(
      getAssetDestPath(asset, 3),
      path.normalize("assets/test/icon@3x.png")
    );
  });

  it("should handle assets with a relative path outside of root", () => {
    const asset = makeAsset({
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/../../test",
    });

    equal(getAssetDestPath(asset, 1), path.normalize("assets/__test/icon.png"));
  });
});
