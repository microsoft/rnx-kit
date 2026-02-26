import type { CLIPlatformBundleConfig } from "./types.ts";

export type BundleConfigOverrides = Partial<
  Pick<
    CLIPlatformBundleConfig,
    | "assetsDest"
    | "bundleEncoding"
    | "bundleOutput"
    | "entryFile"
    | "hermes"
    | "indexedRamBundle"
    | "sourcemapOutput"
    | "sourcemapSourcesRoot"
    | "sourcemapUseAbsolutePath"
    | "treeShake"
    | "unstableTransformProfile"
  >
>;

// TODO: Add `hermes` and `treeShake` when we remove support for `ram-bundle`
export const BUNDLE_CONFIG_COMMAND_LINE_OVERRIDES: readonly (keyof BundleConfigOverrides)[] =
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
 * Apply overrides from the command line, if any, to the bundle configuration.
 * Overrides are applied in-place.
 *
 * @param config Platform-specific bundle configuration; this is modified if any overrides are applied.
 * @param overrides Optional overrides to apply
 * @param keys Config keys to pick from {@link overrides}; defaults to {@link BUNDLE_CONFIG_COMMAND_LINE_OVERRIDES}
 */
export function applyCommandLineOverrides(
  config: CLIPlatformBundleConfig,
  overrides: BundleConfigOverrides,
  flags = BUNDLE_CONFIG_COMMAND_LINE_OVERRIDES
) {
  for (const flag of flags) {
    if (Object.hasOwn(overrides, flag)) {
      const value = overrides[flag];
      // @ts-expect-error TypeScript can't infer that `flag` is a key of `BundleConfigOverrides`, which is a subset of the keys of `CLIPlatformBundleConfig`
      config[flag] = value;
    }
  }
}
