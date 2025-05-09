import type { Resolution } from "metro-resolver";
import * as path from "node:path";
import type { ResolutionContextCompat } from "../types";

/**
 * Returns whether the file at specified path is an asset.
 */
export function isAssetFile(
  context: ResolutionContextCompat,
  filePath: string
): boolean {
  const assetExts = context.assetExts;
  if (assetExts) {
    for (const ext of assetExts) {
      if (filePath.endsWith(ext)) {
        const dot = filePath.length - ext.length - 1;
        if (filePath[dot] === ".") {
          return true;
        }
      }
    }
    return false;
  }

  return Boolean(context.isAssetFile?.(filePath));
}

/**
 * Resolve a file path as an asset. Returns the set of files found after
 * expanding asset resolutions (e.g. `icon@2x.png`).
 *
 * @see {@link https://github.com/facebook/metro/commit/6e6f36fd982b9226b7daafd1c942c7be32f9af40}
 */
export function resolveAsset(
  context: ResolutionContextCompat,
  filePath: string
): Resolution {
  const dirPath = path.dirname(filePath);
  const extension = path.extname(filePath);
  const basename = path.basename(filePath, extension);

  if (!/@\d+(?:\.\d+)?x$/.test(basename)) {
    try {
      const assets = context.resolveAsset(dirPath, basename, extension);
      if (assets != null) {
        return {
          type: "assetFiles",
          filePaths: assets,
        };
      }
    } catch (_) {
      //
    }
  }

  return {
    type: "assetFiles",
    filePaths: [filePath],
  };
}
