import * as path from "node:path";
import type { PackagerAsset, SaveAssetsPlugin } from "./types.ts";

export function getAssetDestPath(asset: PackagerAsset, scale: number): string {
  const suffix = scale === 1 ? "" : `@${scale}x`;
  const fileName = `${asset.name + suffix}.${asset.type}`;
  return path.join(
    // Assets can have relative paths outside of the project root.
    // Replace `../` with `_` to make sure they don't end up outside of
    // the expected assets directory.
    asset.httpServerLocation
      .substring(1)
      .replace("?unstable_path=", "/")
      .replaceAll("../", "_"),
    fileName
  );
}

export const saveAssetsDefault: SaveAssetsPlugin = (
  assets,
  _platform,
  _assetsDest,
  _assetCatalogDest,
  addAssetToCopy
) => {
  for (const asset of assets) {
    addAssetToCopy(asset, undefined, getAssetDestPath);
  }
};
