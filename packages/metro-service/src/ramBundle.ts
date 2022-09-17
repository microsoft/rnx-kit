import type { ConfigT } from "metro-config";
// @ts-expect-error no declaration file for module
import RamBundle from "metro/src/shared/output/RamBundle";
import type { BundleArgs } from "./bundle";
import { bundle } from "./bundle";

export function ramBundle(args: BundleArgs, config: ConfigT): Promise<void> {
  return bundle(args, config, RamBundle);
}
