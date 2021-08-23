import type { BundleDefinitionWithRequiredParameters } from "@rnx-kit/config";
import type { BundleArgs } from "@rnx-kit/metro-service";
import { pickValues } from "@rnx-kit/tools-language/properties";

export type BundleDefinitionOverrides = {
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
 * Apply overrides, if any, to a bundle definition. Overrides are applied in-place.
 *
 * @param overrides Optional overrides to apply
 * @param bundleDefinition Bundle definition to override. This is modified if any overrides are applied.
 */
export function applyBundleDefinitionOverrides(
  overrides: BundleDefinitionOverrides,
  bundleDefinition: BundleDefinitionWithRequiredParameters
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
    Object.assign(bundleDefinition, overridesToApply);
  }
}
