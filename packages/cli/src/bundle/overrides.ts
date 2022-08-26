import type { TransformProfile } from "metro-babel-transformer";
import type { BundleArgs } from "@rnx-kit/metro-service";
import { pickValues } from "@rnx-kit/tools-language/properties";
import type { CliPlatformBundleConfig } from "./types";

export type BundleConfigOverrides = {
  entryFile?: string;
  bundleOutput?: string;
  bundleEncoding?: BundleArgs["bundleEncoding"];
  bundleFormat?: BundleArgs["bundleFormat"];
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  sourcemapUseAbsolutePath?: boolean;
  assetsDest?: string;
  treeShake?: boolean;
  unstableTransformProfile?: TransformProfile;
};

/**
 * Apply overrides, if any, to each rnx-kit bundle configuration. Overrides are applied in-place.
 *
 * @param overrides Optional overrides to apply
 * @param configs Array of platform-specific bundle configurations. This is modified if any overrides are applied.
 */
export function applyBundleConfigOverrides(
  overrides: BundleConfigOverrides,
  configs: CliPlatformBundleConfig[]
): void {
  const overridesToApply = pickValues(overrides, [
    "entryFile",
    "bundleOutput",
    "bundleEncoding",
    "bundleFormat",
    "sourcemapOutput",
    "sourcemapSourcesRoot",
    "sourcemapUseAbsolutePath",
    "assetsDest",
    "treeShake",
    "unstableTransformProfile",
  ]);
  if (overridesToApply) {
    for (const config of configs) {
      Object.assign(config, overridesToApply);
    }
  }
}
