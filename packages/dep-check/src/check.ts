import { getKitCapabilities, getKitConfig } from "@rnx-kit/config";
import chalk from "chalk";
import fs from "fs";
import { diffLinesUnified } from "jest-diff";
import path from "path";
import { error, warn } from "./console";
import { getRequirements } from "./dependencies";
import { findBadPackages } from "./findBadPackages";
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
  { write }: Options = {}
): number {
  const manifestJson = fs.readFileSync(manifestPath, { encoding: "utf-8" });
  const manifest = JSON.parse(manifestJson);
  if (!isManifest(manifest)) {
    error(`'${manifestPath}' does not contain a valid package manifest`);
    return 1;
  }

  const projectRoot = path.dirname(manifestPath);
  const kitConfig = getKitConfig({ cwd: projectRoot });
  if (!kitConfig) {
    return 0;
  }

  const {
    reactNativeVersion: targetReactNativeVersion,
    reactNativeDevVersion,
    kitType,
    capabilities: targetCapabilities,
  } = getKitCapabilities(kitConfig);

  const {
    reactNativeVersion,
    capabilities: requiredCapabilities,
  } = getRequirements(targetReactNativeVersion, manifest, projectRoot);
  requiredCapabilities.push(...targetCapabilities);

  const badPackages = findBadPackages(manifest);
  if (badPackages) {
    warn(
      "Known bad packages are found:\n" +
        badPackages
          .map((pkg) => `    ${pkg.name}@${pkg.version}: ${pkg.reason}`)
          .join("\n")
    );
  }

  if (requiredCapabilities.length === 0) {
    return 0;
  }

  const updatedManifest = updatePackageManifest(
    manifest,
    requiredCapabilities,
    getProfilesFor(reactNativeVersion),
    getProfilesFor(reactNativeDevVersion),
    kitType
  );
  const updatedManifestJson =
    JSON.stringify(updatedManifest, undefined, 2) + "\n";
  const normalizedManifestJson = manifestJson.replace(/\r/g, "");

  if (updatedManifestJson !== normalizedManifestJson) {
    if (write) {
      fs.writeFileSync(manifestPath, updatedManifestJson);
    } else {
      const diff = diffLinesUnified(
        normalizedManifestJson.split("\n"),
        updatedManifestJson.split("\n"),
        {
          aAnnotation: "Current",
          aColor: chalk.red,
          bAnnotation: "Updated",
          bColor: chalk.green,
        }
      );
      console.log(diff);
      return 1;
    }
  }

  return 0;
}
