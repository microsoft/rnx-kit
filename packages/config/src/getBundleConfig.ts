import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import castArray from "lodash/castArray";
import type { KitConfig } from "./kitConfig";
import type { BundleParameters, BundleConfig } from "./bundleConfig";

function failOnUnsupportedProp(
  parameters: BundleParameters,
  name: string,
  message: string
): void {
  if (Object.prototype.hasOwnProperty.call(parameters, name)) {
    throw new Error(
      `The bundle configuration property '${name}' is no longer supported. ${message}`
    );
  }
}

function failOnRenamedProp(
  parameters: BundleParameters,
  oldName: string,
  newName: keyof BundleParameters
): void {
  failOnUnsupportedProp(parameters, oldName, `Use '${newName}' instead.`);
}

function failOnUnsupportedProps(parameters: BundleParameters): void {
  failOnRenamedProp(parameters, "experimental_treeShake", "treeShake");

  failOnRenamedProp(parameters, "entryPath", "entryFile");
  failOnRenamedProp(parameters, "sourceMapPath", "sourcemapOutput");
  failOnRenamedProp(
    parameters,
    "sourceMapSourceRootPath",
    "sourcemapSourcesRoot"
  );
  failOnRenamedProp(parameters, "assetsPath", "assetsDest");

  failOnUnsupportedProp(
    parameters,
    "distPath",
    "You can control the bundle path and source-map path using 'bundleOutput' and 'sourcemapOutput', respectively."
  );
  failOnUnsupportedProp(
    parameters,
    "bundlePrefix",
    "You can control the bundle file name using 'bundleOutput'."
  );
}

/**
 * Get a bundle configuration from the rnx-kit configuration.
 *
 * If an id is given, search for the matching bundle definition. Otherwise, use the first bundle definition.
 *
 * @param config rnx-kit configuration
 * @param id Optional identity of the target bundle parameters to return
 * @returns Bundle configuration, or `undefined` if bundling is not configured or disabled.
 */
export function getBundleConfig(
  config: KitConfig,
  id?: string
): BundleConfig | undefined {
  // 'bundle' property not set?
  if (!Object.prototype.hasOwnProperty.call(config, "bundle")) {
    return undefined;
  }

  // 'bundle' property explicitly set to null/undefined/false?
  if (
    config.bundle === undefined ||
    config.bundle === null ||
    config.bundle === false
  ) {
    return undefined;
  }

  // default bundle config?
  if (config.bundle === true) {
    return {}; // empty -> default config
  }

  const bundles = castArray(config.bundle);

  let bundle: BundleConfig | undefined;
  if (id) {
    bundle = bundles.find((b) => b.id === id);
  } else {
    bundle = bundles.length > 0 ? bundles[0] : undefined;
  }
  if (!bundle) {
    return undefined;
  }

  // 5/20/2022: fail when there are signs of the old config format
  //            remove on the next 0.x bump or when going to 1.0, whichever comes first
  failOnUnsupportedProps(bundle);

  return bundle;
}

/**
 * Resolves the platform selector for a bundle configuration
 *
 * @param bundle Bundle config to resolve (includes the optional platform selectors)
 * @param platform Target platform
 * @returns Bundle config containing platform-specific overrides
 */
export function getBundlePlatformConfig(
  bundle: BundleConfig,
  platform: AllPlatforms
): BundleConfig {
  const platformValues = bundle.platforms
    ? bundle.platforms[platform]
    : undefined;
  return platformValues ? { ...bundle, ...platformValues } : bundle;
}
