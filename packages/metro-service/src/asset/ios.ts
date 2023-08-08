// https://github.com/react-native-community/cli/blob/716555851b442a83a1bf5e0db27b6226318c9a69/packages/cli-plugin-metro/src/commands/bundle/assetCatalogIOS.ts
// https://github.com/react-native-community/cli/blob/716555851b442a83a1bf5e0db27b6226318c9a69/packages/cli-plugin-metro/src/commands/bundle/getAssetDestPathIOS.ts

import fs from "fs";
import type { AssetData } from "metro";
import path from "path";
import { getResourceIdentifier } from "./assetPathUtils";
import type { PackagerAsset } from "./types";

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

export function getAssetDestPathIOS(
  asset: PackagerAsset,
  scale: number
): string {
  const suffix = scale === 1 ? "" : `@${scale}x`;
  const fileName = `${asset.name + suffix}.${asset.type}`;
  return path.join(
    // Assets can have relative paths outside of the project root.
    // Replace `../` with `_` to make sure they don't end up outside of
    // the expected assets directory.
    asset.httpServerLocation.substring(1).replace(/\.\.\//g, "_"),
    fileName
  );
}
