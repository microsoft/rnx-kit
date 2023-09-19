// https://github.com/react-native-community/cli/blob/716555851b442a83a1bf5e0db27b6226318c9a69/packages/cli-plugin-metro/src/commands/bundle/saveAssets.ts

import { info, warn } from "@rnx-kit/console";
import * as fs from "fs";
import * as path from "path";
import { filterPlatformAssetScales } from "./filter";
import type { AssetData, SaveAssetsPlugin } from "./types";

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
  assets: readonly AssetData[],
  platform: string,
  assetsDest: string | undefined,
  assetCatalogDest: string | undefined,
  saveAssetsPlugin: SaveAssetsPlugin
): Promise<void> {
  if (!assetsDest) {
    warn("Assets destination folder is not set, skipping...");
    return Promise.resolve();
  }

  const filesToCopy: Record<string, string> = Object.create(null); // Map src -> dest

  const addAssetToCopy = (
    asset: AssetData,
    allowedScales: number[] | undefined,
    getAssetDestPath: (asset: AssetData, scale: number) => string
  ) => {
    const validScales = new Set(
      filterPlatformAssetScales(allowedScales, asset.scales)
    );

    asset.scales.forEach((scale: number, idx: number) => {
      if (!validScales.has(scale)) {
        return;
      }
      const src = asset.files[idx];
      const dest = path.join(assetsDest, getAssetDestPath(asset, scale));
      filesToCopy[src] = dest;
    });

    asset.scales.forEach((scale, idx) => {
      if (!validScales.has(scale)) {
        return;
      }
      const src = asset.files[idx];
      const dest = path.join(assetsDest, getAssetDestPath(asset, scale));
      filesToCopy[src] = dest;
    });
  };

  saveAssetsPlugin(
    assets,
    platform,
    assetsDest,
    assetCatalogDest,
    addAssetToCopy
  );
  return copyAll(filesToCopy);
}
