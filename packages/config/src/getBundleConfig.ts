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
 * @param config The package's rnx-kit configuration
 * @param id Optional identity of the target bundle configuration
 * @returns Bundle configuration, or `undefined` if nothing was found.
 */
export function getBundleConfig(
  config: KitConfig,
  id?: string
): BundleConfig | undefined {
  if (!config.bundle) {
    return undefined;
  }

  // 5/20/2022: fail when `bundle` is set to true, which is from the old config format
  //            remove on the next 0.x bump or when going to 1.0, whichever comes first
  // @ts-expect-error --^
  if (config.bundle === true) {
    throw new Error(
      `The rnx-kit configuration property 'bundle' no longer supports boolean values. Bundling is always enabled with sensible defaults. You should remove the 'bundle' property to make use of the defaults, or specify the bundle configuration as an object.`
    );
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
export function getPlatformBundleConfig(
  bundle: BundleConfig,
  platform: AllPlatforms
): BundleConfig {
  const platformValues = bundle.platforms
    ? bundle.platforms[platform]
    : undefined;
  return platformValues ? { ...bundle, ...platformValues } : bundle;
}
