// https://github.com/react-native-community/cli/blob/716555851b442a83a1bf5e0db27b6226318c9a69/packages/cli-plugin-metro/src/commands/bundle/saveAssets.ts

import { info, warn } from "@rnx-kit/console";
import * as fs from "node:fs";
import * as path from "node:path";
import { filterPlatformAssetScales } from "./filter.ts";
import type { AssetData, SaveAssetsPlugin } from "./types.ts";

type CopyCallback = (error?: NodeJS.ErrnoException) => void;

function copy(src: string, dest: string, callback: CopyCallback): void {
  const destDir = path.dirname(dest);
  fs.mkdir(destDir, { recursive: true }, (err) => {
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
    const copyNext: CopyCallback = (error) => {
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

    const length = asset.scales.length;
    for (let i = 0; i < length; ++i) {
      const scale = asset.scales[i];
      if (!validScales.has(scale)) {
        return;
      }
      const src = asset.files[i];
      const dest = path.join(assetsDest, getAssetDestPath(asset, scale));
      filesToCopy[src] = dest;
    }
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
