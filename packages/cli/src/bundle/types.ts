import type { BundleArgs } from "@rnx-kit/metro-service";
import type { EventFrequency } from "@rnx-kit/tools-performance";
import type {
  AllPlatforms,
  BundleParameters,
} from "@rnx-kit/types-bundle-config";
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
  perfTrace?: boolean;
  perfMarks?: boolean;
  perfFrequency?: EventFrequency;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  sourcemapUseAbsolutePath?: boolean;
  assetsDest?: string;
  unstableTransformProfile?: TransformProfile;
  resetCache?: boolean;
  config?: string;
};

export type CLIPlatformBundleConfig = BundleParameters &
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
