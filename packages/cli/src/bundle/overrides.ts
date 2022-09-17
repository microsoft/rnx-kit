import { pickValues } from "@rnx-kit/tools-language/properties";
import type { CliPlatformBundleConfig } from "./types";

type BundleConfigOverrides = Partial<
  Pick<
    CliPlatformBundleConfig,
    | "entryFile"
    | "bundleOutput"
    | "bundleEncoding"
    | "sourcemapOutput"
    | "sourcemapSourcesRoot"
    | "sourcemapUseAbsolutePath"
    | "assetsDest"
    | "treeShake"
    | "unstableTransformProfile"
    | "indexedRamBundle"
  >
>;

export const overridableCommonBundleOptions: readonly (keyof BundleConfigOverrides)[] =
  [
    "assetsDest",
    "bundleEncoding",
    "bundleOutput",
    "entryFile",
    "sourcemapOutput",
    "sourcemapSourcesRoot",
    "sourcemapUseAbsolutePath",
    "unstableTransformProfile",
  ];

/**
 * Apply overrides, if any, to each rnx-kit bundle configuration. Overrides are applied in-place.
 *
 * @param overrides Optional overrides to apply
 * @param configs Array of platform-specific bundle configurations. This is modified if any overrides are applied.
 * @param keys Config keys to pick from {@link overrides}
 */
export function applyBundleConfigOverrides(
  overrides: BundleConfigOverrides,
  configs: CliPlatformBundleConfig[],
  keys: (keyof BundleConfigOverrides)[]
): void {
  const overridesToApply = pickValues(overrides, keys);
  if (overridesToApply) {
    for (const config of configs) {
      Object.assign(config, overridesToApply);
    }
  }
}
