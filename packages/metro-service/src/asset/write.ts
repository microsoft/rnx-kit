// https://github.com/react-native-community/cli/blob/716555851b442a83a1bf5e0db27b6226318c9a69/packages/cli-plugin-metro/src/commands/bundle/saveAssets.ts

import { error, info, warn } from "@rnx-kit/console";
import * as fs from "fs";
import type { AssetData } from "metro";
import * as path from "path";
import { getAssetDestPathAndroid } from "./android";
import { filterPlatformAssetScales } from "./filter";
import {
  cleanAssetCatalog,
  getAssetDestPathIOS,
  getImageSet,
  isCatalogAsset,
  writeImageSet,
} from "./ios";

function copy(
  src: string,
  dest: string,
  callback: (error: NodeJS.ErrnoException) => void
): void {
  const destDir = path.dirname(dest);
  fs.mkdir(destDir, { recursive: true }, (err?) => {
    if (err) {
      callback(err);
      return;
    }
    fs.createReadStream(src)
      .pipe(fs.createWriteStream(dest))
      .on("finish", callback);
  });
}

function copyAll(filesToCopy: Record<string, string>) {
  const queue = Object.keys(filesToCopy);
  if (queue.length === 0) {
    return Promise.resolve();
  }

  info(`Copying ${queue.length} asset files`);
  return new Promise<void>((resolve, reject) => {
    const copyNext = (error?: NodeJS.ErrnoException) => {
      if (error) {
        reject(error);
        return;
      }
      if (queue.length === 0) {
        info("Done copying assets");
        resolve();
      } else {
        // queue.length === 0 is checked in previous branch, so this is string
        const src = queue.shift() as string;
        const dest = filesToCopy[src];
        copy(src, dest, copyNext);
      }
    };
    copyNext();
  });
}

export function saveAssets(
  assets: ReadonlyArray<AssetData>,
  platform: string,
  assetsDest: string | undefined,
  assetCatalogDest: string | undefined
): Promise<void> {
  if (!assetsDest) {
    warn("Assets destination folder is not set, skipping...");
    return Promise.resolve();
  }

  const filesToCopy: Record<string, string> = Object.create(null); // Map src -> dest

  const getAssetDestPath =
    platform === "android" ? getAssetDestPathAndroid : getAssetDestPathIOS;

  const addAssetToCopy = (asset: AssetData) => {
    const validScales = new Set(
      filterPlatformAssetScales(platform, asset.scales)
    );

    asset.scales.forEach((scale, idx) => {
      if (!validScales.has(scale)) {
        return;
      }
      const src = asset.files[idx];
      const dest = path.join(assetsDest, getAssetDestPath(asset, scale));
      filesToCopy[src] = dest;
    });
  };

  if (platform === "ios" && assetCatalogDest != null) {
    // Use iOS Asset Catalog for images. This will allow Apple app thinning to
    // remove unused scales from the optimized bundle.
    const catalogDir = path.join(assetCatalogDest, "RNAssets.xcassets");
    if (!fs.existsSync(catalogDir)) {
      error(
        `Could not find asset catalog 'RNAssets.xcassets' in ${assetCatalogDest}. Make sure to create it if it does not exist.`
      );
      return Promise.reject();
    }

    info("Adding images to asset catalog", catalogDir);
    cleanAssetCatalog(catalogDir);
    for (const asset of assets) {
      if (isCatalogAsset(asset)) {
        const imageSet = getImageSet(
          catalogDir,
          asset,
          filterPlatformAssetScales(platform, asset.scales)
        );
        writeImageSet(imageSet);
      } else {
        addAssetToCopy(asset);
      }
    }
    info("Done adding images to asset catalog");
  } else {
    assets.forEach(addAssetToCopy);
  }

  return copyAll(filesToCopy);
}
