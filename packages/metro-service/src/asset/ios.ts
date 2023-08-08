// https://github.com/react-native-community/cli/blob/716555851b442a83a1bf5e0db27b6226318c9a69/packages/cli-plugin-metro/src/commands/bundle/assetCatalogIOS.ts
// https://github.com/react-native-community/cli/blob/716555851b442a83a1bf5e0db27b6226318c9a69/packages/cli-plugin-metro/src/commands/bundle/getAssetDestPathIOS.ts

import fs from "fs";
import type { AssetData } from "metro";
import { error, info } from "@rnx-kit/console";
import path from "path";
import { getResourceIdentifier } from "./assetPathUtils";
import { filterPlatformAssetScales } from "./filter";
import { getAssetDestPath } from "./default";

type ImageSet = {
  basePath: string;
  files: { name: string; src: string; scale: number }[];
};

export function cleanAssetCatalog(catalogDir: string): void {
  const files = fs
    .readdirSync(catalogDir)
    .filter((file) => file.endsWith(".imageset"));
  for (const file of files) {
    fs.rmSync(path.join(catalogDir, file));
  }
}

export function getImageSet(
  catalogDir: string,
  asset: AssetData,
  scales: readonly number[]
): ImageSet {
  const fileName = getResourceIdentifier(asset);
  return {
    basePath: path.join(catalogDir, `${fileName}.imageset`),
    files: scales.map((scale, idx) => {
      const suffix = scale === 1 ? "" : `@${scale}x`;
      return {
        name: `${fileName + suffix}.${asset.type}`,
        scale,
        src: asset.files[idx],
      };
    }),
  };
}

export function isCatalogAsset(asset: AssetData): boolean {
  return asset.type === "png" || asset.type === "jpg" || asset.type === "jpeg";
}

export function writeImageSet(imageSet: ImageSet): void {
  fs.mkdirSync(imageSet.basePath, { recursive: true });

  for (const file of imageSet.files) {
    const dest = path.join(imageSet.basePath, file.name);
    fs.copyFileSync(file.src, dest);
  }

  fs.writeFileSync(
    path.join(imageSet.basePath, "Contents.json"),
    JSON.stringify({
      images: imageSet.files.map((file) => ({
        filename: file.name,
        idiom: "universal",
        scale: `${file.scale}x`,
      })),
      info: {
        author: "xcode",
        version: 1,
      },
    })
  );
}

const ALLOWED_SCALES = [1, 2, 3];

export function saveAssetsIOS(
  assets: ReadonlyArray<AssetData>,
  _platform: string,
  _assetsDest: string | undefined,
  assetCatalogDest: string | undefined,
  addAssetToCopy: (
    asset: AssetData,
    allowedScales: number[] | undefined,
    getAssetDestPath: (asset: AssetData, scale: number) => string
  ) => void
) {
  if (assetCatalogDest != null) {
    // Use iOS Asset Catalog for images. This will allow Apple app thinning to
    // remove unused scales from the optimized bundle.
    const catalogDir = path.join(assetCatalogDest, "RNAssets.xcassets");
    if (!fs.existsSync(catalogDir)) {
      error(
        `Could not find asset catalog 'RNAssets.xcassets' in ${assetCatalogDest}. Make sure to create it if it does not exist.`
      );
      return;
    }

    info("Adding images to asset catalog", catalogDir);
    cleanAssetCatalog(catalogDir);
    for (const asset of assets) {
      if (isCatalogAsset(asset)) {
        const imageSet = getImageSet(
          catalogDir,
          asset,
          filterPlatformAssetScales(ALLOWED_SCALES, asset.scales)
        );
        writeImageSet(imageSet);
      } else {
        addAssetToCopy(asset, ALLOWED_SCALES, getAssetDestPath);
      }
    }
    info("Done adding images to asset catalog");
  } else {
    assets.forEach((asset) =>
      addAssetToCopy(asset, ALLOWED_SCALES, getAssetDestPath)
    );
  }
}
