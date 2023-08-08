// https://github.com/react-native-community/cli/blob/716555851b442a83a1bf5e0db27b6226318c9a69/packages/cli-plugin-metro/src/commands/bundle/getAssetDestPathAndroid.ts

import * as path from "path";
import { getResourceIdentifier } from "./assetPathUtils";
import type { PackagerAsset } from "./types";
import type { AssetData } from "metro";

export function getAndroidAssetSuffix(scale: number): string {
  const tolerance = 0.01;
  const scaleApprox = scale + tolerance;
  if (scaleApprox >= 4) {
    return "xxxhdpi";
  } else if (scaleApprox >= 3) {
    return "xxhdpi";
  } else if (scaleApprox >= 2) {
    return "xhdpi";
  } else if (scaleApprox >= 1.5) {
    return "hdpi";
  } else if (scaleApprox >= 1) {
    return "mdpi";
  } else {
    return "ldpi";
  }
}

// See https://developer.android.com/guide/topics/resources/drawable-resource.html
const drawableFileTypes = new Set<string>([
  "gif",
  "jpeg",
  "jpg",
  "png",
  "webp",
  "xml",
]);

function getAndroidResourceFolderName(
  asset: PackagerAsset,
  scale: number
): string {
  if (!drawableFileTypes.has(asset.type)) {
    return "raw";
  }
  const suffix = getAndroidAssetSuffix(scale);
  const androidFolder = `drawable-${suffix}`;
  return androidFolder;
}

export function getAssetDestPathAndroid(
  asset: PackagerAsset,
  scale: number
): string {
  const androidFolder = getAndroidResourceFolderName(asset, scale);
  const fileName = getResourceIdentifier(asset);
  return path.join(androidFolder, `${fileName}.${asset.type}`);
}

export function saveAssetsAndroid(
  assets: ReadonlyArray<AssetData>,
  _platform: string,
  _assetsDest: string | undefined,
  _assetCatalogDest: string | undefined,
  addAssetToCopy: (
    asset: AssetData,
    allowedScales: number[] | undefined,
    getAssetDestPath: (asset: AssetData, scale: number) => string
  ) => void
) {
  assets.forEach((asset) =>
    addAssetToCopy(asset, undefined, getAssetDestPathAndroid)
  );
}
