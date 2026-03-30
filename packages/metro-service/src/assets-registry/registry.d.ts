export type PackagerAsset = {
  readonly __packager_asset: boolean;
  readonly fileSystemLocation: string;
  readonly httpServerLocation: string;
  readonly width?: null | undefined | number;
  readonly height?: null | undefined | number;
  readonly scales: number[];
  readonly hash: string;
  readonly name: string;
  readonly type: string;
};
export declare function registerAsset(asset: PackagerAsset): number;
export declare function getAssetByID(assetId: number): PackagerAsset;
