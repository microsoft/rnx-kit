import type {
  BundleParameters,
  BundleRequiredParameters,
} from "@rnx-kit/config";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";

export type KitBundleConfig = BundleParameters &
  BundleRequiredParameters & {
    /**
     * Target platform for the bundle
     */
    platform: AllPlatforms;
  };

export type BundleConfig = KitBundleConfig & {
  /**
   * Choose whether or not this will be a "developer" bundle. The alternative is a "production" bundle.
   *
   * When `true`, warnings are enabled, and the bundle is not minified by default.
   * Further, optimizations like constant folding are disabled.
   *
   * When `false`, warnings are disabled and the bundle is minified by default.
   */
  dev: boolean;

  /**
   * Optionally choose whether or not the bundle is minified. When not set, minification is controlled by the `dev` property.
   */
  minify?: boolean;
};
