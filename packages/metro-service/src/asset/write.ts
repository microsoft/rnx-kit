import fs from "fs";
import path from "path";
import mkdirp from "mkdirp";

import type { AssetData } from "metro";

import { getAssetDestPathAndroid } from "./android";
import { getAssetDestPathIOS } from "./ios";
import { filterPlatformAssetScales } from "./filter";

function copy(
  src: string,
  dest: string,
  callback: (error: NodeJS.ErrnoException) => void
): void {
  const destDir = path.dirname(dest);
  mkdirp(destDir, (err?: NodeJS.ErrnoException) => {
    if (err) {
      callback(err);
      return;
    }
    fs.createReadStream(src)
      .pipe(fs.createWriteStream(dest))
      .on("finish", callback);
  });
}

async function copyAll(filesToCopy: Record<string, string>): Promise<void> {
  const queue = Object.keys(filesToCopy);
  if (queue.length === 0) {
    return Promise.resolve();
  }

  console.info(`Copying ${queue.length} asset files`);
  return new Promise((resolve, reject) => {
    const copyNext = (error?: NodeJS.ErrnoException) => {
      if (error) {
        reject(error);
        return;
      }
      if (queue.length === 0) {
        console.info("Done copying assets");
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

export async function saveAssets(
  assets: readonly AssetData[],
  platform: string,
  assetsDest: string | undefined
): Promise<void> {
  if (!assetsDest) {
    console.warn("Assets destination folder is not set, skipping...");
    return Promise.resolve();
  }

  const getAssetDestPath =
    platform === "android" ? getAssetDestPathAndroid : getAssetDestPathIOS;

  const filesToCopy: Record<string, string> = Object.create(null); // Map src -> dest
  assets.forEach((asset) => {
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
  });

  return copyAll(filesToCopy);
}
