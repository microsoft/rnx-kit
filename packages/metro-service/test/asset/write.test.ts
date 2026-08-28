import { getMockFSFiles, mockFS } from "@rnx-kit/tools-filesystem/mocks";
import { deepEqual, equal } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { saveAssetsDefault } from "../../src/asset/default.ts";
import { saveAssets } from "../../src/asset/write.ts";
import { makeAssetData, mockPath } from "./helper.ts";

describe("saveAssets", () => {
  it("skips copying when the destination folder is not set", async () => {
    const fs = mockFS({ "icon.png": "icon" });

    await saveAssets(
      [
        makeAssetData({
          name: "icon",
          type: "png",
          httpServerLocation: "/assets/test",
          scales: [1],
          files: ["icon.png"],
        }),
      ],
      "ios",
      undefined,
      undefined,
      saveAssetsDefault,
      fs
    );

    // Only the source file remains; nothing was copied.
    deepEqual(Object.keys(getMockFSFiles(fs)), [mockPath("icon.png")]);
  });

  it("copies asset files to the destination folder", async () => {
    const fs = mockFS({ "icon.png": "one", "icon@2x.png": "two" });

    await saveAssets(
      [
        makeAssetData({
          name: "icon",
          type: "png",
          httpServerLocation: "/assets/test",
          scales: [1, 2],
          files: ["icon.png", "icon@2x.png"],
        }),
      ],
      "ios",
      "dist",
      undefined,
      saveAssetsDefault,
      fs
    );

    const files = getMockFSFiles(fs);
    const dest = mockPath("dist", "assets", "test");

    equal(files[path.posix.join(dest, "icon.png")], "one");
    equal(files[path.posix.join(dest, "icon@2x.png")], "two");
  });

  it("only copies files via the plugin if specified", async () => {
    const fs = mockFS({ "icon.png": "one", "icon@2x.png": "two" });

    await saveAssets(
      [
        makeAssetData({
          name: "icon",
          type: "png",
          httpServerLocation: "/assets/test",
          scales: [1, 2],
          files: ["icon.png", "icon@2x.png"],
        }),
      ],
      "ios",
      "dist",
      undefined,
      // Plugin that only allows 1x assets through.
      (assets, _platform, _dest, _catalog, addAssetToCopy) => {
        for (const asset of assets) {
          addAssetToCopy(asset, [1], (a, scale) => {
            const suffix = scale === 1 ? "" : `@${scale}x`;
            return `${a.name}${suffix}.${a.type}`;
          });
        }
      },
      fs
    );

    const files = getMockFSFiles(fs);
    const dest = mockPath("dist");

    equal(files[path.posix.join(dest, "icon.png")], "one");
    equal(files[path.posix.join(dest, "icon@2x.png")], undefined);
  });
});
