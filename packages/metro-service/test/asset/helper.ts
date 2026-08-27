import * as path from "node:path";
import type { AssetData } from "../../src/asset/types.ts";
import type { PackagerAsset } from "../../src/assets-registry/registry.ts";

type Asset = Pick<PackagerAsset, "name" | "type" | "httpServerLocation">;

type AssetDataInput = Pick<
  AssetData,
  "name" | "type" | "httpServerLocation" | "scales" | "files"
>;

export function makeAsset(asset: Asset): PackagerAsset {
  return {
    __packager_asset: true,
    ...asset,
    fileSystemLocation: asset.httpServerLocation,
    scales: [1],
    hash: "",
  };
}

export function makeAssetData(asset: AssetDataInput): AssetData {
  return {
    __packager_asset: true,
    fileSystemLocation: asset.httpServerLocation,
    hash: "",
    width: null,
    height: null,
    ...asset,
  };
}

// memfs stores keys as POSIX paths (forward slashes, no drive letter).
// Build expected keys the same way so lookups work on Windows too.
export function mockPath(...segments: string[]): string {
  const cwd = process
    .cwd()
    .replace(/^[a-zA-Z]:/, "")
    .replace(/\\/g, "/");
  return path.posix.join(cwd, ...segments);
}
