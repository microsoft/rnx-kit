import type { BundleDefinitionWithRequiredParameters } from "@rnx-kit/config";
import { getBundleDefinition, getKitConfig } from "@rnx-kit/config";
import { warn } from "@rnx-kit/console";
import chalk from "chalk";

/**
 * Get a bundle definition from the kit configuration.
 *
 * @param id Optional bundle definition id. Only needed when the kit config has more than one definition.
 * @returns Bundle definition matching the id (if given), or the first bundle definition found. `undefined` if bundling is disabled or not supported for the kit.
 */
export function getKitBundleDefinition(
  id?: string
): BundleDefinitionWithRequiredParameters | undefined {
  const kitConfig = getKitConfig();
  if (!kitConfig) {
    throw new Error(
      "No kit configuration found for this react-native experience"
    );
  }

  if (kitConfig.bundle === null || kitConfig.bundle === undefined) {
    warn(
      chalk.yellow(
        "No bundle configuration found for this react-native experience -- skipping bundling"
      )
    );
    return undefined;
  } else if (!kitConfig.bundle) {
    warn(
      chalk.yellow(
        "Bundling is disabled for this react-native experience -- skipping"
      )
    );
    return undefined;
  }

  // get the bundle definition
  return getBundleDefinition(kitConfig.bundle, id);
}
