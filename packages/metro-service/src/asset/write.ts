import * as fs from "fs";
import type { AssetData } from "metro";
import * as path from "path";
import { getAssetDestPathAndroid } from "./android";
import { filterPlatformAssetScales } from "./filter";
import { getAssetDestPathIOS } from "./ios";

function copy(src: string, dest: string): void {
  const destDir = path.dirname(dest);
  fs.mkdirSync(destDir, { recursive: true, mode: 0o755 });
  fs.copyFileSync(src, dest);
}

function copyAll(filesToCopy: Record<string, string>): void {
  const queue = Object.keys(filesToCopy);
  if (queue.length === 0) {
    return;
  }

  console.info(`Copying ${queue.length} asset files`);
  for (const src of queue) {
    copy(src, filesToCopy[src]);
  }
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

  copyAll(filesToCopy);
  return Promise.resolve();
}
