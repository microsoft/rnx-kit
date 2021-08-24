import type {
  BundleParameters,
  BundleRequiredParameters,
} from "@rnx-kit/config";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";

export type KitBundleConfig = BundleParameters &
  BundleRequiredParameters & {
    platform: AllPlatforms;
  };
