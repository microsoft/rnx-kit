import type { AssetData } from "metro";
import type { PackagerAsset } from "../assets-registry/registry";

export type SaveAssetsPlugin = (
  assets: readonly AssetData[],
  platform: string,
  assetsDest: string | undefined,
  assetCatalogDest: string | undefined,
  addAssetToCopy: (
    asset: AssetData,
    allowedScales: number[] | undefined,
    getAssetDestPath: (asset: AssetData, scale: number) => string
  ) => void
) => void;

export { AssetData, PackagerAsset };
