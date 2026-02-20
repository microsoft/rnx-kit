import type { BuildOptions as EsbuildBuildOptions } from "esbuild";
import type { BaseBuildOptions } from "./index.ts";

/**
 * These are type-level tests to ensure our BaseBuildOptions type stays compatible with esbuild's BuildOptions.
 *
 * They will be checked at build time and will produce errors if our local options get out of sync with the esbuild
 * types
 */

/**
 * --- Type-level assertions ---
 * These produce a TS error during the typescript build if the conditions aren't met.
 */
type Assert<T extends true> = T;
type Extends<A, B> = [A] extends [B] ? true : false;

/**
 * Guarantee that our BaseBuildOptions is still assignable to esbuild's BuildOptions.
 * - If this fails, BaseBuildOptions can no longer be passed where esbuild expects BuildOptions.
 */
export type BaseAssignableToEsbuild = Assert<
  Extends<BaseBuildOptions, EsbuildBuildOptions>
>;

/**
 * Check that the overlapping keys are still compatible field-by-field.
 * - This gives targeted failures if esbuild changes a property type.
 */
type OverlapKeys = keyof BaseBuildOptions & keyof EsbuildBuildOptions;

export type OverlapStillCompatible = Assert<
  Extends<
    { [K in OverlapKeys]: BaseBuildOptions[K] },
    { [K in OverlapKeys]: EsbuildBuildOptions[K] }
  >
>;

/**
 * Ensure keys aren't misspelled or haven't drifted compared to esbuild:
 * - This will fail if a key that esbuild *doesn't* have is included.
 */
export type NoExtraKeys = Assert<
  Extends<keyof BaseBuildOptions, keyof EsbuildBuildOptions>
>;
