import prompts from "prompts";
import { checkPackageManifest } from "./check";
import { readJsonFile, writeJsonFile } from "./json";
import { defaultProfiles, parseProfilesString } from "./profiles";
import { concatVersionRanges, isString, keysOf } from "./helpers";
import type { Command, ProfileVersion } from "./types";

function profileToChoice(version: ProfileVersion): prompts.Choice {
  return { title: version, value: version };
}

async function parseInput(versions: string | number): Promise<{
  supportedVersions?: string;
  targetVersion?: string;
}> {
  // When `--set-version` is without a value, `versions` is an empty string if
  // invoked directly. When invoked via `@react-native-community/cli`,
  // `versions` is `true` instead.
  if (isString(versions) && versions) {
    return parseProfilesString(versions);
  }

  const { supportedVersions } = await prompts({
    type: "multiselect",
    name: "supportedVersions",
    message: "Select all supported versions of `react-native`",
    choices: keysOf(defaultProfiles).map(profileToChoice),
    min: 1,
  });
  if (!Array.isArray(supportedVersions)) {
    return {};
  }

  const targetVersion =
    supportedVersions.length === 1
      ? supportedVersions[0]
      : (
          await prompts({
            type: "select",
            name: "targetVersion",
            message: "Select development version of `react-native`",
            choices: supportedVersions.map(profileToChoice),
          })
        ).targetVersion;
  if (!supportedVersions.includes(targetVersion)) {
    return {};
  }

  return {
    supportedVersions: concatVersionRanges(supportedVersions),
    targetVersion,
  };
}

export async function makeSetVersionCommand(
  versions: string | number
): Promise<Command | undefined> {
  const { supportedVersions, targetVersion } = await parseInput(versions);
  if (!supportedVersions) {
    return undefined;
  }

  return (manifestPath: string) => {
    const checkReturnCode = checkPackageManifest(manifestPath);
    if (checkReturnCode !== 0) {
      return checkReturnCode;
    }

    const manifest = readJsonFile(manifestPath);
    const rnxKitConfig = manifest["rnx-kit"];
    if (!rnxKitConfig) {
      return 0;
    }

    rnxKitConfig.reactNativeVersion = supportedVersions;
    rnxKitConfig.reactNativeDevVersion = targetVersion;

    writeJsonFile(manifestPath, manifest);
    return checkPackageManifest(manifestPath, { write: true });
  };
}
