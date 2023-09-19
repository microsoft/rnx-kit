// https://github.com/react-native-community/cli/blob/716555851b442a83a1bf5e0db27b6226318c9a69/packages/cli-plugin-metro/src/commands/bundle/getAssetDestPathAndroid.ts

import * as path from "path";
import {
  getAndroidResourceFolderName,
  getAndroidResourceIdentifier,
} from "../assets-registry/path-support";
import type { PackagerAsset, SaveAssetsPlugin } from "./types";

export function getAssetDestPathAndroid(
  asset: PackagerAsset,
  scale: number
): string {
  const androidFolder = getAndroidResourceFolderName(asset, scale);
  const fileName = getAndroidResourceIdentifier(asset);
  return path.join(androidFolder, `${fileName}.${asset.type}`);
}

export const saveAssetsAndroid: SaveAssetsPlugin = (
  assets,
  _platform,
  _assetsDest,
  _assetCatalogDest,
  addAssetToCopy
) => {
  assets.forEach((asset) =>
    addAssetToCopy(asset, undefined, getAssetDestPathAndroid)
  );
};
