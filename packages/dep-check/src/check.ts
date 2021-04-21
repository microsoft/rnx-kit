import { getKitConfig } from "@rnx-kit/config";
import chalk from "chalk";
import fs from "fs";
import { diffLinesUnified } from "jest-diff";
import path from "path";
import semver from "semver";
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

function minVersion(version: unknown): string {
  const v = typeof version === "string" && semver.minVersion(version)?.version;
  return v || "0.0.0";
}

export function checkPackageManifest(
  manifestPath: string,
  { check, write }: Options = {}
): number {
  const errorCode = check ? 1 : 0;

  const manifestJson = fs.readFileSync(manifestPath, { encoding: "utf-8" });
  const manifest = JSON.parse(manifestJson);
  if (!isManifest(manifest)) {
    console.error(
      `error: '${manifestPath}' does not contain a valid package manifest`
    );
    return errorCode;
  }

  const kitConfig = getKitConfig({ cwd: path.dirname(manifestPath) });
  if (!kitConfig) {
    return 0;
  }

  const {
    capabilities,
    kitType = "library",
    reactNativeVersion,
    reactNativeDevVersion = minVersion(reactNativeVersion),
  } = kitConfig;
  if (
    !reactNativeVersion ||
    (!semver.valid(reactNativeVersion) &&
      !semver.validRange(reactNativeVersion))
  ) {
    console.error(
      `error: '${reactNativeVersion}' is not a valid version range`
    );
    return errorCode;
  }

  if (!semver.satisfies(reactNativeDevVersion, reactNativeVersion)) {
    console.error(
      `error: '${reactNativeDevVersion}' does not satisfy supported version range '${reactNativeVersion}'`
    );
    return errorCode;
  }

  const badPackages = findBadPackages(manifest);
  if (badPackages) {
    console.warn("Known bad packages are found:");
    console.warn(
      badPackages
        .map((pkg) => `    ${pkg.name}@${pkg.version}: ${pkg.reason}`)
        .join("\n")
    );
  }

  if (!capabilities || capabilities.length === 0) {
    return 0;
  }

  const updatedManifest = updatePackageManifest(
    manifest,
    capabilities,
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
      return errorCode;
    }
  }

  return 0;
}
