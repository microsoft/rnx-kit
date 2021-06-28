import path from "path";
import type { PackagerAsset } from "./types";

/**
 * FIXME: using number to represent discrete scale numbers is fragile in essence because of
 * floating point numbers imprecision.
 */
function getAndroidAssetSuffix(scale: number): string {
  switch (scale) {
    case 0.75:
      return "ldpi";
    case 1:
      return "mdpi";
    case 1.5:
      return "hdpi";
    case 2:
      return "xhdpi";
    case 3:
      return "xxhdpi";
    case 4:
      return "xxxhdpi";
    default:
      return "";
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
  if (!suffix) {
    throw new Error(
      `Don't know which android drawable suffix to use for asset: ${JSON.stringify(
        asset
      )}`
    );
  }
  const androidFolder = `drawable-${suffix}`;
  return androidFolder;
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
