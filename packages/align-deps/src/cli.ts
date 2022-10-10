#!/usr/bin/env node

import type { KitType } from "@rnx-kit/config";
import { error, warn } from "@rnx-kit/console";
import { hasProperty } from "@rnx-kit/tools-language/properties";
import { findPackageDir } from "@rnx-kit/tools-node/package";
import {
  findWorkspacePackages,
  findWorkspaceRoot,
} from "@rnx-kit/tools-workspaces";
import isString from "lodash/isString";
import * as path from "path";
import { makeCheckCommand } from "./check";
import { initializeConfig } from "./initialize";
import { resolveCustomProfiles } from "./profiles";
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

async function getManifests(
  packages: (string | number)[] | undefined
): Promise<string[] | undefined> {
  if (Array.isArray(packages)) {
    return packages.reduce<string[]>((result, pkg) => {
      const dir = findPackageDir(pkg.toString());
      if (dir) {
        result.push(path.join(dir, "package.json"));
      }
      return result;
    }, []);
  }

  const packageDir = findPackageDir();
  if (!packageDir) {
    return undefined;
  }

  // Make sure we don't return all packages when dep-check is run inside a
  // package that just happened to be part of a workspace.
  const currentPackageJson = path.join(packageDir, "package.json");
  try {
    if ((await findWorkspaceRoot()) !== packageDir) {
      return [currentPackageJson];
    }
  } catch (_) {
    return [currentPackageJson];
  }

  try {
    const allPackages = (await findWorkspacePackages()).map((p) =>
      path.join(p, "package.json")
    );
    allPackages.push(currentPackageJson);
    return allPackages;
  } catch (e) {
    if (hasProperty(e, "message")) {
      error(e.message);
      return undefined;
    }

    throw e;
  }
}

function makeInitializeCommand(
  kitType: string,
  customProfiles: string | undefined
): Command | undefined {
  const verifiedKitType = ensureKitType(kitType);
  if (!verifiedKitType) {
    error(`Invalid kit type: '${kitType}'`);
    return undefined;
  }

  return (manifest: string) => {
    initializeConfig(manifest, {
      kitType: verifiedKitType,
      customProfilesPath: customProfiles,
    });
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
    "custom-profiles": customProfiles,
    "exclude-packages": excludePackages,
    init,
    loose,
    "set-version": setVersion,
    vigilant,
    write,
  } = args;

  if (isString(init)) {
    return makeInitializeCommand(init, customProfiles?.toString());
  }

  // When `--set-version` is without a value, `setVersion` is an empty string if
  // invoked directly. When invoked via `@react-native-community/cli`,
  // `setVersion` is `true` instead.
  if (setVersion || isString(setVersion)) {
    return makeSetVersionCommand(setVersion);
  }

  if (isString(vigilant)) {
    const customProfilesPath = resolveCustomProfiles(
      process.cwd(),
      customProfiles?.toString()
    );
    return makeVigilantCommand({
      customProfiles: customProfilesPath,
      excludePackages: excludePackages?.toString(),
      loose,
      versions: vigilant.toString(),
      write,
    });
  }

  return makeCheckCommand({ loose, write });
}

export async function cli({ packages, ...args }: Args): Promise<void> {
  const command = await makeCommand(args);
  if (!command) {
    process.exit(1);
  }

  const manifests = await getManifests(packages);
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
      if (hasProperty(e, "message")) {
        const currentPackageJson = path.relative(process.cwd(), manifest);

        if (hasProperty(e, "code") && e.code === "ENOENT") {
          warn(`${currentPackageJson}: ${e.message}`);
          return exitCode;
        }

        error(`${currentPackageJson}: ${e.message}`);
        return exitCode || 1;
      }

      throw e;
    }
  }, 0);

  process.exit(exitCode);
}

if (require.main === module) {
  require("yargs").usage(
    "$0 [packages...]",
    "Dependency checker for React Native apps",
    {
      "custom-profiles": {
        description:
          "Path to custom profiles. This can be a path to a JSON file, a `.js` file, or a module name.",
        type: "string",
        requiresArg: true,
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
      loose: {
        default: false,
        description:
          "Determines how strict the React Native version requirement should be. Useful for apps that depend on a newer React Native version than their dependencies declare support for.",
        type: "boolean",
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
