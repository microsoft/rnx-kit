import { getMockFSFiles, mockFS } from "@rnx-kit/tools-filesystem/mocks";
import { deepEqual, equal, ok } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  cleanAssetCatalog,
  getImageSet,
  isCatalogAsset,
  writeImageSet,
} from "../../src/asset/ios.ts";
import { makeAssetData, mockPath } from "./helper.ts";

describe("isCatalogAsset", () => {
  it("returns true for image types Xcode asset catalogs support", () => {
    for (const type of ["png", "jpg", "jpeg"]) {
      ok(
        isCatalogAsset(
          makeAssetData({
            name: "icon",
            type,
            httpServerLocation: "/assets",
            scales: [1],
            files: [`icon.${type}`],
          })
        )
      );
    }
  });

  it("returns false for unsupported types", () => {
    for (const type of ["gif", "webp", "mp4", "svg"]) {
      ok(
        !isCatalogAsset(
          makeAssetData({
            name: "icon",
            type,
            httpServerLocation: "/assets",
            scales: [1],
            files: [`icon.${type}`],
          })
        )
      );
    }
  });
});

describe("getImageSet", () => {
  it("builds an image set with a suffix per scale", () => {
    const asset = makeAssetData({
      name: "icon",
      type: "png",
      httpServerLocation: "/assets/test",
      scales: [1, 2, 3],
      files: ["icon.png", "icon@2x.png", "icon@3x.png"],
    });

    deepEqual(getImageSet("catalog", asset, [1, 2, 3]), {
      basePath: path.join("catalog", "test_icon.imageset"),
      files: [
        { name: "test_icon.png", scale: 1, src: "icon.png" },
        { name: "test_icon@2x.png", scale: 2, src: "icon@2x.png" },
        { name: "test_icon@3x.png", scale: 3, src: "icon@3x.png" },
      ],
    });
  });
});

describe("writeImageSet", () => {
  it("copies files and writes Contents.json into the image set", () => {
    const fs = mockFS({ "icon.png": "one", "icon@2x.png": "two" });

    writeImageSet(
      {
        basePath: path.posix.join("catalog", "icon.imageset"),
        files: [
          { name: "icon.png", scale: 1, src: "icon.png" },
          { name: "icon@2x.png", scale: 2, src: "icon@2x.png" },
        ],
      },
      fs
    );

    const files = getMockFSFiles(fs);
    const base = mockPath("catalog", "icon.imageset");

    equal(files[path.posix.join(base, "icon.png")], "one");
    equal(files[path.posix.join(base, "icon@2x.png")], "two");

    const contents = JSON.parse(files[path.posix.join(base, "Contents.json")]);
    deepEqual(contents, {
      images: [
        { filename: "icon.png", idiom: "universal", scale: "1x" },
        { filename: "icon@2x.png", idiom: "universal", scale: "2x" },
      ],
      info: { author: "xcode", version: 1 },
    });
  });
});

describe("cleanAssetCatalog", () => {
  it("removes existing `.imageset` directories but keeps other files", () => {
    const fs = mockFS({
      "catalog/icon.imageset/icon.png": "icon",
      "catalog/icon.imageset/Contents.json": "{}",
      "catalog/keep.txt": "keep",
    });

    const catalogDir = mockPath("catalog");

    cleanAssetCatalog(catalogDir, fs);

    const remaining = fs.readdirSync(catalogDir);
    deepEqual(remaining, ["keep.txt"]);
  });
});
