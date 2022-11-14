import type { KitType } from "@rnx-kit/config";
import { error } from "@rnx-kit/console";
import type { PackageManifest } from "@rnx-kit/tools-node/package";
import { readPackage } from "@rnx-kit/tools-node/package";
import * as path from "path";
import semverMinVersion from "semver/ranges/min-version";
import { capabilitiesFor } from "../capabilities";
import { defaultConfig } from "../config";
import { dropPatchFromVersion, modifyManifest } from "../helpers";
import { filterPreset, mergePresets } from "../preset";
import type { Command, Options } from "../types";

function isKitType(type: string): type is KitType {
  return type === "app" || type === "library";
}

function minVersion(versionRange: string): string {
  const ver = semverMinVersion(versionRange);
  if (!ver) {
    throw new Error(
      `Could not determine the lowest version that satisfies range: ${versionRange}`
    );
  }
  return ver.version;
}

/**
 * Generates an `align-deps` configuration for a React Native package by
 * inspecting its dependencies.
 *
 * Note that this function uses the `react-native` version to determine which
 * profile to use. If the package is not a React Native app/library, this
 * function will return early.
 *
 * @param manifest The package manifest to update
 * @param projectRoot The root of the project
 * @param kitType The project type
 * @param options Options from the command line
 * @returns A configured package manifest; `null` if the React Native version could not be determined
 */
export function initializeConfig(
  manifest: PackageManifest,
  projectRoot: string,
  kitType: KitType,
  { presets }: Options
): PackageManifest | null {
  const kitConfig = manifest["rnx-kit"];
  if (kitConfig?.alignDeps) {
    return null;
  }

  const { dependencies, devDependencies, peerDependencies } = manifest;
  const targetReactNativeVersion =
    peerDependencies?.["react-native"] ||
    dependencies?.["react-native"] ||
    devDependencies?.["react-native"];
  if (!targetReactNativeVersion) {
    return null;
  }

  const requirements = [
    `react-native@${dropPatchFromVersion(targetReactNativeVersion)}`,
  ];
  const preset = filterPreset(mergePresets(presets, projectRoot), requirements);

  return {
    ...manifest,
    "rnx-kit": {
      ...kitConfig,
      kitType,
      alignDeps: {
        presets: presets === defaultConfig.presets ? undefined : presets,
        requirements:
          kitType === "app"
            ? requirements
            : {
                development: [
                  `react-native@${dropPatchFromVersion(
                    devDependencies?.["react-native"]
                      ? devDependencies["react-native"]
                      : minVersion(targetReactNativeVersion)
                  )}`,
                ],
                production: requirements,
              },
        capabilities: capabilitiesFor(manifest, preset),
      },
    },
  };
}

export function makeInitializeCommand(
  kitType: string,
  options: Options
): Command | undefined {
  if (!isKitType(kitType)) {
    error(`Invalid kit type: '${kitType}'`);
    return undefined;
  }

  return (manifestPath: string) => {
    const manifest = readPackage(manifestPath);
    if (manifest["rnx-kit"]?.alignDeps) {
      return "success";
    }

    const updatedManifest = initializeConfig(
      manifest,
      path.dirname(manifestPath),
      kitType,
      options
    );
    if (!updatedManifest) {
      return "missing-react-native";
    }

    modifyManifest(manifestPath, updatedManifest);
    return "success";
  };
}
