import { keysOf } from "@rnx-kit/tools-language/properties";
import type { PackageManifest } from "@rnx-kit/tools-node/package";
import isString from "lodash/isString";
import prompts from "prompts";
import semverCoerce from "semver/functions/coerce";
import { transformConfig } from "../compatibility/config";
import { defaultConfig, loadConfig } from "../config";
import { isError } from "../errors";
import { modifyManifest } from "../helpers";
import defaultPreset from "../presets/microsoft/react-native";
import type {
  AlignDepsConfig,
  Command,
  LegacyCheckConfig,
  Options,
} from "../types";
import { checkPackageManifest } from "./check";

function parseVersions(versions: string): string[] {
  return versions.split(",").map((v) => {
    const coerced = semverCoerce(v.trim());
    if (!coerced) {
      throw new Error(`'${v}' is not a valid version number`);
    }

    const parsedVersion = `${coerced.major}.${coerced.minor}`;
    if (!(parsedVersion in defaultPreset)) {
      throw new Error(
        `'${parsedVersion}' is not a supported react-native version`
      );
    }

    return parsedVersion;
  });
}

function toChoice(version: string): prompts.Choice {
  return { title: version, value: version };
}

async function parseInput(versions: string | number): Promise<{
  supportedVersions: string[];
  targetVersion: string;
} | null> {
  // When `--set-version` is without a value, `versions` is an empty string if
  // invoked directly. When invoked via `@react-native-community/cli`,
  // `versions` is `true` instead.
  if (isString(versions) && versions) {
    const supportedVersions = parseVersions(versions);
    const targetVersion = supportedVersions[0];
    return { supportedVersions: supportedVersions.sort(), targetVersion };
  }

  const { supportedVersions } = await prompts({
    type: "multiselect",
    name: "supportedVersions",
    message: "Select all supported versions of `react-native`",
    choices: keysOf(defaultPreset).map(toChoice),
    min: 1,
  });
  if (!Array.isArray(supportedVersions)) {
    return null;
  }

  const targetVersion =
    supportedVersions.length === 1
      ? supportedVersions[0]
      : (
          await prompts({
            type: "select",
            name: "targetVersion",
            message: "Select development version of `react-native`",
            choices: supportedVersions.map(toChoice),
          })
        ).targetVersion;
  if (!supportedVersions.includes(targetVersion)) {
    return null;
  }

  return { supportedVersions, targetVersion };
}

function setRequirement(requirements: string[], versionRange: string): void {
  const prefix = "react-native@";
  const index = requirements.findIndex((r: string) => r.startsWith(prefix));
  if (index >= 0) {
    requirements[index] = prefix + versionRange;
  }
}

function updateRequirements(
  { requirements }: AlignDepsConfig["alignDeps"],
  prodVersion: string,
  devVersion = prodVersion
): void {
  if (Array.isArray(requirements)) {
    setRequirement(requirements, prodVersion);
  } else {
    setRequirement(requirements.production, prodVersion);
    setRequirement(requirements.development, devVersion);
  }
}

/**
 * Updates the package's `react-native` versions.
 * @param config Configuration in the package manifest
 * @param targetVersion React Native version for daily usage
 * @param supportedVersions React Native versions that the package will support
 * @returns Updated package manifest
 */
function setVersion(
  config: AlignDepsConfig | LegacyCheckConfig,
  targetVersion: string,
  supportedVersions: string[]
): PackageManifest {
  const { kitType, manifest } = config;
  const alignDeps =
    "alignDeps" in config
      ? config.alignDeps
      : transformConfig(config).alignDeps;

  if (kitType === "app") {
    updateRequirements(alignDeps, targetVersion);
  } else {
    updateRequirements(
      alignDeps,
      supportedVersions.join(" || "),
      targetVersion
    );
  }

  manifest["rnx-kit"] = {
    ...manifest["rnx-kit"],
    kitType,
    alignDeps: {
      ...alignDeps,
      presets:
        // The default presets were added with `loadConfig`. We need to remove
        // it here to not add new fields to the config.
        alignDeps.presets === defaultConfig.presets
          ? undefined
          : alignDeps.presets,
    },
  };

  return config.manifest;
}

/**
 * Creates the `set-version` command.
 *
 * Note that this command will only run if the package is configured and
 * contains no misalignments.
 *
 * @param versions Version range string provided on the command line
 * @param options Command line options
 * @returns The `set-version` command
 */
export async function makeSetVersionCommand(
  versions: string | number,
  options: Options
): Promise<Command | undefined> {
  const input = await parseInput(versions);
  if (!input) {
    return undefined;
  }

  const { supportedVersions, targetVersion } = input;
  const checkOnly = { ...options, loose: false, write: false };
  const write = { ...options, loose: false, write: true };

  return (manifestPath: string) => {
    const config = loadConfig(manifestPath);
    if (isError(config)) {
      return config;
    }

    const checkResult = checkPackageManifest(manifestPath, checkOnly, config);
    if (checkResult !== "success") {
      return checkResult;
    }

    const result = setVersion(config, targetVersion, supportedVersions);
    modifyManifest(manifestPath, result);
    return checkPackageManifest(manifestPath, write);
  };
}
