import type { AllPlatforms, BundleParameters } from "@rnx-kit/core-types";
import type { BundleArgs } from "@rnx-kit/metro-service";
import type { TransformProfile } from "metro-babel-transformer";

export type CLICommonBundleOptions = {
  id?: string;
  entryFile?: string;
  platform?: AllPlatforms;
  dev: boolean;
  minify?: boolean;
  bundleOutput?: string;
  bundleEncoding?: BundleArgs["bundleEncoding"];
  maxWorkers?: number;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  sourcemapUseAbsolutePath?: boolean;
  assetsDest?: string;
  unstableTransformProfile?: TransformProfile;
  resetCache?: boolean;
  config?: string;
};

export type CliPlatformBundleConfig = BundleParameters &
  Required<
    Pick<
      BundleParameters,
      | "entryFile"
      | "bundleOutput"
      | "sourcemapUseAbsolutePath"
      | "treeShake"
      | "plugins"
    >
  > & {
    unstableTransformProfile?: TransformProfile;

    /**
     * Target platform for the bundle
     */
    platform: AllPlatforms;
  };
