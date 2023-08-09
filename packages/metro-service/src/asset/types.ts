import type { AssetData } from "metro";

export type PackagerAsset = {
  httpServerLocation: string;
  name: string;
  type: string;
};

export type SaveAssetsPlugin = (
  assets: ReadonlyArray<AssetData>,
  platform: string,
  assetsDest: string | undefined,
  assetCatalogDest: string | undefined,
  addAssetToCopy: (
    asset: AssetData,
    allowedScales: number[] | undefined,
    getAssetDestPath: (asset: AssetData, scale: number) => string
  ) => void
) => void;
