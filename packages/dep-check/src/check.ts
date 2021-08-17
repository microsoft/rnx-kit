import { getKitCapabilities, getKitConfig } from "@rnx-kit/config";
import { error, info, warn } from "@rnx-kit/console";
import chalk from "chalk";
import fs from "fs";
import { diffLinesUnified } from "jest-diff";
import path from "path";
import { getRequirements } from "./dependencies";
import { findBadPackages } from "./findBadPackages";
import { readJsonFile } from "./json";
import { updatePackageManifest } from "./manifest";
import { getProfilesFor } from "./profiles";
import type { Options, PackageManifest } from "./types";

export function isManifest(manifest: unknown): manifest is PackageManifest {
  return (
    typeof manifest === "object" &&
    manifest !== null &&
    "name" in manifest &&
    "version" in manifest
  );
}

export function checkPackageManifest(
  manifestPath: string,
  { uncheckedReturnCode = 0, write }: Options = {}
): number {
  const manifest = readJsonFile(manifestPath);
  if (!isManifest(manifest)) {
    error(`'${manifestPath}' does not contain a valid package manifest`);
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
  } = getKitCapabilities(kitConfig);

  const { reactNativeVersion, capabilities: requiredCapabilities } =
    getRequirements(
      targetReactNativeVersion,
      kitType,
      manifest,
      projectRoot,
      customProfiles
    );
  requiredCapabilities.push(...targetCapabilities);

  if (requiredCapabilities.length === 0) {
    return uncheckedReturnCode;
  }

  const updatedManifest = updatePackageManifest(
    manifest,
    requiredCapabilities,
    getProfilesFor(reactNativeVersion, customProfiles),
    getProfilesFor(reactNativeDevVersion, customProfiles),
    kitType
  );

  // Don't fail when manifests only have whitespace differences.
  const updatedManifestJson = JSON.stringify(updatedManifest, undefined, 2);
  const normalizedManifestJson = JSON.stringify(manifest, undefined, 2);

  if (updatedManifestJson !== normalizedManifestJson) {
    if (write) {
      fs.writeFileSync(manifestPath, updatedManifestJson + "\n");
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

      return 1;
    }
  }

  return 0;
}
