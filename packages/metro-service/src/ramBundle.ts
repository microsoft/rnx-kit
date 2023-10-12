import type { ConfigT } from "metro-config";
import * as path from "path";
import type { BundleArgs } from "./bundle";
import { bundle } from "./bundle";
import { requireMetroPath } from "./metro";

export function ramBundle(args: BundleArgs, config: ConfigT): Promise<void> {
  const ramBundlePath = path.join(
    requireMetroPath(config.projectRoot),
    "src",
    "shared",
    "output",
    "RamBundle"
  );
  return bundle(args, config, require(ramBundlePath));
}
