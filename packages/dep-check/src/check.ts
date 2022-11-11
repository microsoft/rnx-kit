import { getKitCapabilities, getKitConfig } from "@rnx-kit/config";
import { error, info, warn } from "@rnx-kit/console";
import { isPackageManifest, readPackage } from "@rnx-kit/tools-node/package";
import chalk from "chalk";
import { diffLinesUnified } from "jest-diff";
import path from "path";
import { getRequirements } from "./dependencies";
import { findBadPackages } from "./findBadPackages";
import { modifyManifest, printMigrationMessage } from "./helpers";
import { updatePackageManifest } from "./manifest";
import { getProfilesFor, resolveCustomProfiles } from "./profiles";
import type { CheckConfig, CheckOptions, Command } from "./types";

export function getCheckConfig(
  manifestPath: string,
  {
    loose,
    uncheckedReturnCode = 0,
    supportedVersions,
    targetVersion,
  }: CheckOptions
): number | CheckConfig {
  const manifest = readPackage(manifestPath);
  if (!isPackageManifest(manifest)) {
    error(
      `'${manifestPath}' does not contain a valid package manifest - please make sure it's not missing 'name' or 'version'`
    );
    return 1;
  }

  const badPackages = findBadPackages(manifest);
  if (badPackages) {
    warn(
      `Known bad packages are found in '${manifest.name}':\n` +
        badPackages
          .map((pkg) => `    ${pkg.name}@${pkg.version}: ${pkg.reason}`)
          .join("\n")
    );
  }

  const projectRoot = path.dirname(manifestPath);
  const kitConfig = getKitConfig({ cwd: projectRoot });
  if (!kitConfig) {
    return uncheckedReturnCode;
  }

  const {
    reactNativeVersion: targetReactNativeVersion,
    reactNativeDevVersion,
    kitType,
    capabilities: targetCapabilities,
    customProfiles,
  } = getKitCapabilities({
    // React Native versions declared in the package's config should always
    // override the ones specified with the `--vigilant` flag.
    ...(supportedVersions
      ? { reactNativeVersion: supportedVersions }
      : undefined),
    // We should not set dev version if the package is configured. It may have
    // been intentionally left out to reuse `reactNativeVersion`.
    ...(!kitConfig.reactNativeVersion && targetVersion
      ? { reactNativeDevVersion: targetVersion }
      : undefined),
    ...kitConfig,
  });

  const customProfilesPath = resolveCustomProfiles(projectRoot, customProfiles);

  const { reactNativeVersion, capabilities: requiredCapabilities } =
    getRequirements(
      targetReactNativeVersion,
      kitType,
      manifest,
      projectRoot,
      customProfilesPath,
      { loose }
    );
  requiredCapabilities.push(...targetCapabilities);

  return {
    kitType,
    reactNativeVersion,
    reactNativeDevVersion,
    capabilities: requiredCapabilities,
    customProfilesPath,
    manifest,
  };
}

export function checkPackageManifest(
  manifestPath: string,
  options: CheckOptions
): number {
  const result = options.config || getCheckConfig(manifestPath, options);
  if (typeof result === "number") {
    return result;
  }

  const {
    kitType,
    reactNativeVersion,
    reactNativeDevVersion,
    capabilities,
    customProfilesPath,
    manifest,
  } = result;

  if (capabilities.length === 0) {
    return options.uncheckedReturnCode || 0;
  }

  const updatedManifest = updatePackageManifest(
    manifest,
    capabilities,
    getProfilesFor(reactNativeVersion, customProfilesPath),
    getProfilesFor(reactNativeDevVersion, customProfilesPath),
    kitType
  );

  // Don't fail when manifests only have whitespace differences.
  const updatedManifestJson = JSON.stringify(updatedManifest, undefined, 2);
  const normalizedManifestJson = JSON.stringify(manifest, undefined, 2);

  if (updatedManifestJson !== normalizedManifestJson) {
    if (options.write) {
      modifyManifest(manifestPath, updatedManifest);
    } else {
      const diff = diffLinesUnified(
        normalizedManifestJson.split("\n"),
        updatedManifestJson.split("\n"),
        {
          aAnnotation: "Current",
          aColor: chalk.red,
          bAnnotation: "Expected",
          bColor: chalk.green,
        }
      );
      console.log(diff);

      error(
        "Changes are needed to satisfy all requirements. Re-run with `--write` to have dep-check apply them."
      );

      const url = chalk.bold("https://aka.ms/dep-check");
      info(`Visit ${url} for more information about dep-check.`);

      printMigrationMessage();

      return 1;
    }
  }

  printMigrationMessage();

  return 0;
}

export function makeCheckCommand(options: CheckOptions): Command {
  return (manifest: string) => {
    return checkPackageManifest(manifest, options);
  };
}
