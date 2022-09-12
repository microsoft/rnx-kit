import type { TransformProfile } from "metro-babel-transformer";
import type { BundleParameters } from "@rnx-kit/config";
import type { BundleArgs } from "@rnx-kit/metro-service";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";

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
      | "detectCyclicDependencies"
      | "detectDuplicateDependencies"
      | "typescriptValidation"
      | "treeShake"
    >
  > & {
    unstableTransformProfile?: TransformProfile;

    /**
     * Target platform for the bundle
     */
    platform: AllPlatforms;
  };
