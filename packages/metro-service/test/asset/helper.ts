import type { PackagerAsset } from "../../src/assets-registry/registry";

type Asset = Pick<PackagerAsset, "name" | "type" | "httpServerLocation">;

export function makeAsset(asset: Asset): PackagerAsset {
  return {
    __packager_asset: true,
    ...asset,
    fileSystemLocation: asset.httpServerLocation,
    scales: [1],
    hash: "",
  };
}
