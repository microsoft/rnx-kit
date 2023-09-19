import type { PackagerAsset } from "./registry";
export declare function getAndroidResourceFolderName(
  asset: PackagerAsset,
  scale: number
): string | "raw";
export declare function getAndroidResourceIdentifier(
  asset: PackagerAsset
): string;
export declare function getBasePath(asset: PackagerAsset): string;
