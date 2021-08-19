import { isApproximatelyEqual } from "@rnx-kit/tools-language/math";
import path from "path";
import type { PackagerAsset } from "./types";

export function getAndroidAssetSuffix(
  asset: PackagerAsset,
  scale: number
): string {
  const tolerance = 0.01;
  if (isApproximatelyEqual(scale, 0.75, tolerance)) {
    return "ldpi";
  } else if (isApproximatelyEqual(scale, 1, tolerance)) {
    return "mdpi";
  } else if (isApproximatelyEqual(scale, 1.5, tolerance)) {
    return "hdpi";
  } else if (isApproximatelyEqual(scale, 2, tolerance)) {
    return "xhdpi";
  } else if (isApproximatelyEqual(scale, 3, tolerance)) {
    return "xxhdpi";
  } else if (isApproximatelyEqual(scale, 4, tolerance)) {
    return "xxxhdpi";
  }

  throw new Error(
    `Don't know which android drawable suffix to use for asset: ${JSON.stringify(
      asset
    )}`
  );
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
  return `drawable-${getAndroidAssetSuffix(asset, scale)}`;
}

function getBasePath(asset: PackagerAsset): string {
  let basePath = asset.httpServerLocation;
  if (basePath[0] === "/") {
    basePath = basePath.substr(1);
  }
  return basePath;
}

function getAndroidResourceIdentifier(asset: PackagerAsset): string {
  const folderPath = getBasePath(asset);
  return `${folderPath}/${asset.name}`
    .toLowerCase()
    .replace(/\//g, "_") // Encode folder structure in file name
    .replace(/([^a-z0-9_])/g, "") // Remove illegal chars
    .replace(/^assets_/, ""); // Remove "assets_" prefix
}

export function getAssetDestPathAndroid(
  asset: PackagerAsset,
  scale: number
): string {
  const androidFolder = getAndroidResourceFolderName(asset, scale);
  const fileName = getAndroidResourceIdentifier(asset);
  return path.join(androidFolder, `${fileName}.${asset.type}`);
}
