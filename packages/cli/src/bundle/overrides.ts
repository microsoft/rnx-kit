import type { BundleArgs } from "@rnx-kit/metro-service";
import { pickValues } from "@rnx-kit/tools-language/properties";
import type { KitBundleConfig } from "../bundle/types";

export type KitBundleConfigOverrides = {
  entryPath?: string;
  distPath?: string;
  assetsPath?: string;
  bundlePrefix?: string;
  bundleEncoding?: BundleArgs["bundleEncoding"];
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  experimentalTreeShake?: boolean;
};

/**
 * Apply overrides, if any, to a kit bundle config. Overrides are applied in-place.
 *
 * @param overrides Optional overrides to apply
 * @param config Kit bundle config to override. This is modified if any overrides are applied.
 */
export function applyKitBundleConfigOverrides(
  overrides: KitBundleConfigOverrides,
  config: KitBundleConfig
): void {
  const overridesToApply = pickValues(
    overrides,
    [
      "entryPath",
      "distPath",
      "assetsPath",
      "bundlePrefix",
      "bundleEncoding",
      "sourcemapOutput",
      "sourcemapSourcesRoot",
      "experimentalTreeShake",
    ],
    [
      "entryPath",
      "distPath",
      "assetsPath",
      "bundlePrefix",
      "bundleEncoding",
      "sourcemapOutput",
      "sourcemapSourcesRoot",
      "experimental_treeShake",
    ]
  );
  if (overridesToApply) {
    Object.assign(config, overridesToApply);
  }
}
