/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import path from "path";
import type { AssetData } from "metro";
import type { PackagerAsset } from "./types";

export function getAssetDestPath(asset: PackagerAsset, scale: number): string {
  const suffix = scale === 1 ? "" : `@${scale}x`;
  const fileName = `${asset.name + suffix}.${asset.type}`;
  return path.join(
    // Assets can have relative paths outside of the project root.
    // Replace `../` with `_` to make sure they don't end up outside of
    // the expected assets directory.
    asset.httpServerLocation.substr(1).replace(/\.\.\//g, "_"),
    fileName
  );
}

export function saveAssetsDefault(
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
  assets.forEach((asset) => addAssetToCopy(asset, undefined, getAssetDestPath));
}
