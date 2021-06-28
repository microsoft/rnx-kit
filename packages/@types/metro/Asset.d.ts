export type AssetDataWithoutFiles = {
  readonly __packager_asset: boolean;
  readonly fileSystemLocation: string;
  readonly hash: string;
  readonly height?: number;
  readonly httpServerLocation: string;
  readonly name: string;
  readonly scales: Array<number>;
  readonly type: string;
  readonly width?: number;
};

export type AssetData = AssetDataWithoutFiles & {
  readonly files: Array<string>;
};
