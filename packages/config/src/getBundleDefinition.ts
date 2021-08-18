import type { AllPlatforms } from "@rnx-kit/tools-react-native";
import castArray from "lodash/castArray";
import type {
  BundleConfig,
  BundleDefinition,
  BundleRequiredParameters,
} from "./bundleConfig";

export type BundleDefinitionWithRequiredParameters = BundleDefinition &
  BundleRequiredParameters;

/**
 * Get a bundle definition from the kit config.
 *
 * If an id is given, search for the matching bundle and return it. Otherwise, return the first bundle
 * in the kit config.
 *
 * @param config bundle configuration, typically retrieved from the kit configuration
 * @param id target bundle definition to use -- not needed if only one bundle definition exists
 * @returns bundle definition with defaults for any missing values that have them
 */
export function getBundleDefinition(
  config: BundleConfig,
  id?: string
): BundleDefinitionWithRequiredParameters {
  const defaultDefinition: BundleRequiredParameters = {
    entryPath: "lib/index.js",
    distPath: "dist",
    assetsPath: "dist",
    bundlePrefix: "index",
    detectCyclicDependencies: true,
    detectDuplicateDependencies: true,
    typescriptValidation: true,
    experimental_treeShake: false,
  };
  if (typeof config === "boolean") {
    return defaultDefinition;
  }

  const bundles = castArray(config);
  if (id) {
    const bundle = bundles.find((b) => b.id === id) || {};
    return { ...defaultDefinition, ...bundle };
  }

  return { ...defaultDefinition, ...bundles[0] };
}

/**
 * Resolves the platform selector for a bundle definition
 *
 * @param bundle - bundle definition, potentially including a platform selector
 * @param platform - current platform target
 * @returns bundle definition containing all platform-specific overrides
 */
export function getBundlePlatformDefinition(
  bundle: BundleDefinitionWithRequiredParameters,
  platform: AllPlatforms
): BundleDefinitionWithRequiredParameters {
  const platformValues = bundle.platforms && bundle.platforms[platform];
  return platformValues ? { ...bundle, ...platformValues } : bundle;
}
