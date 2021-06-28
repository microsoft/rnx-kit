import path from "path";
import type { PackagerAsset } from "./types";

export function getAssetDestPathIOS(
  asset: PackagerAsset,
  scale: number
): string {
  const suffix = scale === 1 ? "" : `@${scale}x`;
  const fileName = `${asset.name + suffix}.${asset.type}`;
  return path.join(
    // Assets can have relative paths outside of the project root.
    // Replace `../` with `_` to make sure they don't end up outside of
    // the expected assets directory.
    asset.httpServerLocation.substr(1).replace(/\.\.\//g, "_"),
    fileName
  );
}
