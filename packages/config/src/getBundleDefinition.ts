import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import castArray from "lodash/castArray";
import type { KitConfig } from "./kitConfig";
import type { BundleDefinition } from "./bundleConfig";

function failOnUnsupportedDefinitionProp(
  o: unknown,
  name: string,
  message: string
): void {
  if (Object.prototype.hasOwnProperty.call(o, name)) {
    throw new Error(
      `The '${name}' configuration property is no longer supported. ${message}`
    );
  }
}

function failOnRenamedDefinitionProp(
  o: unknown,
  oldName: string,
  newName: string
): void {
  failOnUnsupportedDefinitionProp(o, oldName, `Use '${newName}' instead.`);
}

function failOnUnsupportedDefinitionProps(bundle: BundleDefinition): void {
  failOnRenamedDefinitionProp(bundle, "experimental_treeShake", "treeShake");

  failOnRenamedDefinitionProp(bundle, "entryPath", "entryFile");
  failOnRenamedDefinitionProp(bundle, "sourceMapPath", "sourcemapOutput");
  failOnRenamedDefinitionProp(
    bundle,
    "sourceMapSourceRootPath",
    "sourcemapSourcesRoot"
  );
  failOnRenamedDefinitionProp(bundle, "assetsPath", "assetsDest");

  failOnUnsupportedDefinitionProp(
    bundle,
    "distPath",
    "You can control the bundle path and source-map path using 'bundleOutput' and 'sourcemapOutput', respectively."
  );
  failOnUnsupportedDefinitionProp(
    bundle,
    "bundlePrefix",
    "You can control the bundle file name using 'bundleOutput'."
  );
}

/**
 * Get a bundle definition from the rnx-kit configuration.
 *
 * If an id is given, search for the matching bundle definition. Otherwise, use the first bundle definition.
 *
 * @param config rnx-kit configuration
 * @param id Optional identity of the target bundle definition to return
 * @returns Bundle definition
 */
export function getBundleDefinition(
  config: KitConfig,
  id?: string
): BundleDefinition {
  // 'bundle' property not set?
  if (!Object.prototype.hasOwnProperty.call(config, "bundle")) {
    throw new Error(
      "Bundling is not enabled in the rnx-kit configuration for this package."
    );
  }

  // 'bundle' property explicitly set to null/undefined/false?
  if (
    config.bundle === undefined ||
    config.bundle === null ||
    config.bundle === false
  ) {
    throw new Error(
      "Bundling is explicitly disabled in the rnx-kit configuration for this package."
    );
  }

  // default bundle config?
  if (config.bundle === true) {
    return {}; // empty -> default config
  }

  const bundles = castArray(config.bundle);

  let bundle: BundleDefinition | undefined;
  if (id) {
    bundle = bundles.find((b) => b.id === id);
    if (!bundle) {
      throw new Error(
        `Bundle definition with id '${id}' was not found in the rnx-kit configuration for this package.`
      );
    }
  } else {
    bundle = bundles.length > 0 ? bundles[0] : undefined;
    if (!bundle) {
      throw new Error(
        "No bundle definitions were found in the rnx-kit configuration for this package."
      );
    }
  }

  // 5/20/2022: fail when there are signs of the old config format
  //            remove on the next 0.x bump or when going to 1.0, whichever comes first
  failOnUnsupportedDefinitionProps(bundle);

  return bundle;
}

/**
 * Resolves the platform selector for a bundle definition
 *
 * @param bundle Bundle definition to resolve (includes the optional platform selectors)
 * @param platform Target platform
 * @returns Bundle definition containing platform-specific overrides
 */
export function getBundlePlatformDefinition(
  bundle: BundleDefinition,
  platform: AllPlatforms
): BundleDefinition {
  const platformValues = bundle.platforms
    ? bundle.platforms[platform]
    : undefined;
  return platformValues ? { ...bundle, ...platformValues } : bundle;
}
