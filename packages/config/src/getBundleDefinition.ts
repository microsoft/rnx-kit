import { AllPlatforms, BundleConfig, BundleDefinition } from "./bundleConfig";

function asArray<T>(opt: T | T[]): T[] {
  return Array.isArray(opt) ? opt : [opt || ({} as T)];
}

/**
 * Get a bundle definition from the kit config.
 *
 * If an id is given, search for the matching bundle and return it. Otherwise, return the first bundle
 * in the kit config.
 *
 * @param config bundle configuration, typically retrieved from the kit configuration
 * @param id target bundle definition to use -- not needed if only one bundle definition exists
 * @returns bundle definition that is fully specified, using defaults where necessary
 */
export function getBundleDefinition(
  config: BundleConfig,
  id?: string
): BundleDefinition {
  const defaultDefinition: BundleDefinition = {
    entryPath: "./lib/index.js",
    distPath: "./dist",
    assetsPath: "./dist",
    bundlePrefix: "index",
  };
  if (typeof config === "boolean") {
    return defaultDefinition;
  }

  const bundles = asArray<BundleDefinition>(config);
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
  bundle: BundleDefinition,
  platform: AllPlatforms
): BundleDefinition {
  const platformValues = bundle.platforms && bundle.platforms[platform];
  return platformValues ? { ...bundle, ...platformValues } : bundle;
}
