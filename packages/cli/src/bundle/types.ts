import type { TransformProfile } from "metro-babel-transformer";
import type { BundleParameters } from "@rnx-kit/config";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";

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
