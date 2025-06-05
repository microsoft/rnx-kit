import { warn } from "@rnx-kit/console";
import type { ConfigT } from "metro-config";
import * as path from "path";
import { bundle } from "./bundle";
import { requireMetroPath } from "./metro";
import type { BundleArgs } from "./types";

export function ramBundle(args: BundleArgs, config: ConfigT): Promise<void> {
  warn(
    "RAM bundle is deprecated and was removed in 0.75; for more details, see https://github.com/facebook/react-native/pull/43292"
  );

  const ramBundlePath = path.join(
    requireMetroPath(config.projectRoot),
    "src",
    "shared",
    "output",
    "RamBundle"
  );
  return bundle(args, config, require(ramBundlePath));
}
