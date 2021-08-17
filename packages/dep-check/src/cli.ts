#!/usr/bin/env node

import type { KitType } from "@rnx-kit/config";
import { error } from "@rnx-kit/console";
import * as path from "path";
import pkgDir from "pkg-dir";
import { getAllPackageJsonFiles, getWorkspaceRoot } from "workspace-tools";
import yargs from "yargs";
import { checkPackageManifest } from "./check";
import { isString } from "./helpers";
import { initializeConfig } from "./initialize";
import { makeSetVersionCommand } from "./setVersion";
import type { Args, Command } from "./types";
import { makeVigilantCommand } from "./vigilant";

function ensureKitType(type: string): KitType | undefined {
  switch (type) {
    case "app":
    case "library":
      return type;
    default:
      return undefined;
  }
}

function getManifests(
  packageJson: string | number | undefined
): string[] | undefined {
  if (isString(packageJson) && packageJson) {
    return [packageJson];
  }

  const packageDir = pkgDir.sync();
  if (!packageDir) {
    return undefined;
  }

  // Make sure we don't return all packages when dep-check is run inside a
  // package that just happened to be part of a workspace.
  const currentPackageJson = path.join(packageDir, "package.json");
  try {
    if (getWorkspaceRoot(packageDir) !== packageDir) {
      return [currentPackageJson];
    }
  } catch (_) {
    return [currentPackageJson];
  }

  try {
    return getAllPackageJsonFiles(packageDir);
  } catch (e) {
    error(e.message);
    return undefined;
  }
}

function makeCheckCommand(write: boolean): Command {
  return (manifest: string) => {
    return checkPackageManifest(manifest, { write });
  };
}

function makeInitializeCommand(kitType: string): Command | undefined {
  const verifiedKitType = ensureKitType(kitType);
  if (!verifiedKitType) {
    error(`Invalid kit type: '${kitType}'`);
    return undefined;
  }

  const options = { kitType: verifiedKitType };
  return (manifest: string) => {
    initializeConfig(manifest, options);
    return 0;
  };
}

function reportConflicts(conflicts: [string, string][], args: Args): boolean {
  return conflicts.reduce<boolean>((result, [lhs, rhs]) => {
    if (lhs in args && rhs in args) {
      error(`--${lhs} and --${rhs} cannot both be specified at the same time.`);
      return true;
    }
    return result;
  }, false);
}

async function makeCommand(args: Args): Promise<Command | undefined> {
  const conflicts: [string, string][] = [
    ["init", "vigilant"],
    ["init", args.write ? "write" : "no-write"],
    ["set-version", args.write ? "write" : "no-write"],
  ];
  if (reportConflicts(conflicts, args)) {
    return undefined;
  }

  const {
    "custom-profiles": customProfilesPath,
    "exclude-packages": excludePackages,
    init,
    "set-version": setVersion,
    vigilant,
    write,
  } = args;

  if (isString(init)) {
    return makeInitializeCommand(init);
  }

  // When `--set-version` is without a value, `setVersion` is an empty string if
  // invoked directly. When invoked via `@react-native-community/cli`,
  // `setVersion` is `true` instead.
  if (setVersion || isString(setVersion)) {
    return makeSetVersionCommand(setVersion);
  }

  if (isString(vigilant)) {
    return makeVigilantCommand({
      customProfilesPath,
      excludePackages,
      versions: vigilant,
      write,
    });
  }

  return makeCheckCommand(write);
}

export async function cli({
  "package-json": packageJson,
  ...args
}: Args): Promise<void> {
  const command = await makeCommand(args);
  if (!command) {
    process.exit(1);
  }

  const manifests = getManifests(packageJson);
  if (!manifests) {
    error("Could not find package root");
    process.exit(1);
  }

  // We will optimistically run through all packages regardless of failures. In
  // most scenarios, this should be fine: Both init and check+write write to
  // disk only when everything is in order for the target package. Packages with
  // invalid or missing configurations are skipped.
  const exitCode = manifests.reduce((exitCode: number, manifest: string) => {
    try {
      return command(manifest) || exitCode;
    } catch (e) {
      const currentPackageJson = path.relative(process.cwd(), manifest);
      error(`${currentPackageJson}: ${e.message}`);
      return exitCode || 1;
    }
  }, 0);

  process.exit(exitCode);
}

if (require.main === module) {
  yargs.usage(
    "$0 [package-json]",
    "Dependency checker for React Native apps",
    {
      "custom-profiles": {
        description:
          "Path to custom profiles. This can be a path to a JSON file, a `.js` file, or a module name.",
        type: "string",
        requiresArg: true,
        implies: "vigilant",
      },
      "exclude-packages": {
        description:
          "Comma-separated list of package names to exclude from inspection.",
        type: "string",
        requiresArg: true,
        implies: "vigilant",
      },
      init: {
        description:
          "Writes an initial kit config to the specified 'package.json'.",
        choices: ["app", "library"],
        conflicts: ["vigilant"],
      },
      "set-version": {
        description:
          "Sets `reactNativeVersion` and `reactNativeDevVersion` for any configured package. There is an interactive prompt if no value is provided. The value should be a comma-separated list of `react-native` versions to set, where the first number specifies the development version. Example: `0.64,0.63`",
        type: "string",
        conflicts: ["init", "vigilant"],
      },
      vigilant: {
        description:
          "Inspects packages regardless of whether they've been configured. Specify a comma-separated list of profile versions to compare against, e.g. `0.63,0.64`. The first number specifies the target version.",
        type: "string",
        requiresArg: true,
        conflicts: ["init"],
      },
      write: {
        default: false,
        description: "Writes changes to the specified 'package.json'.",
        type: "boolean",
      },
    },
    cli
  ).argv;
}
