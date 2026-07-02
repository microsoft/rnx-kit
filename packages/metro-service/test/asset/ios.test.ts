import { deepEqual, equal, ok } from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  cleanAssetCatalog,
  getImageSet,
  isCatalogAsset,
  writeImageSet,
} from "../../src/asset/ios.ts";
import type { AssetData } from "../../src/asset/types.ts";
import { makeAsset } from "./helper.ts";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rnx-kit-metro-service-"));
  tempDirs.push(dir);
  return dir;
}

function makeAssetData({
  files = [],
  name = "icon",
  scales = [1],
  type = "png",
}: {
  files?: string[];
  name?: string;
  scales?: number[];
  type?: string;
} = {}): AssetData {
  return {
    ...makeAsset({
      name,
      type,
      httpServerLocation: "/assets/test",
    }),
    files,
    scales,
  };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("iOS asset catalog", () => {
  it("removes existing image sets when cleaning a catalog", () => {
    const catalogDir = makeTempDir();
    const imageSet = path.join(catalogDir, "icon.imageset");
    const otherDir = path.join(catalogDir, "not-an-image-set");

    fs.mkdirSync(imageSet);
    fs.mkdirSync(otherDir);
    fs.writeFileSync(path.join(catalogDir, "Contents.json"), "{}");

    cleanAssetCatalog(catalogDir);

    equal(fs.existsSync(imageSet), false);
    equal(fs.existsSync(otherDir), true);
    equal(fs.existsSync(path.join(catalogDir, "Contents.json")), true);
  });

  it("builds image set entries for each scale", () => {
    const catalogDir = makeTempDir();
    const asset = makeAssetData({
      files: ["/tmp/icon.png", "/tmp/icon@2x.png", "/tmp/icon@3x.png"],
      scales: [1, 2, 3],
    });

    deepEqual(getImageSet(catalogDir, asset, [1, 2, 3]), {
      basePath: path.join(catalogDir, "test_icon.imageset"),
      files: [
        { name: "test_icon.png", scale: 1, src: "/tmp/icon.png" },
        { name: "test_icon@2x.png", scale: 2, src: "/tmp/icon@2x.png" },
        { name: "test_icon@3x.png", scale: 3, src: "/tmp/icon@3x.png" },
      ],
    });
  });

  it("recognizes image assets that can be added to catalogs", () => {
    equal(isCatalogAsset(makeAssetData({ type: "png" })), true);
    equal(isCatalogAsset(makeAssetData({ type: "jpg" })), true);
    equal(isCatalogAsset(makeAssetData({ type: "jpeg" })), true);
    equal(isCatalogAsset(makeAssetData({ type: "mp4" })), false);
  });

  it("writes image set files and Contents.json", () => {
    const sourceDir = makeTempDir();
    const catalogDir = makeTempDir();
    const source = path.join(sourceDir, "icon.png");
    fs.writeFileSync(source, "png");

    writeImageSet({
      basePath: path.join(catalogDir, "test_icon.imageset"),
      files: [{ name: "test_icon.png", scale: 1, src: source }],
    });

    equal(
      fs.readFileSync(
        path.join(catalogDir, "test_icon.imageset", "test_icon.png"),
        "utf8"
      ),
      "png"
    );

    const contents = JSON.parse(
      fs.readFileSync(
        path.join(catalogDir, "test_icon.imageset", "Contents.json"),
        "utf8"
      )
    );

    deepEqual(contents, {
      images: [
        {
          filename: "test_icon.png",
          idiom: "universal",
          scale: "1x",
        },
      ],
      info: {
        author: "xcode",
        version: 1,
      },
    });
    ok(fs.statSync(path.join(catalogDir, "test_icon.imageset")).isDirectory());
  });
});
