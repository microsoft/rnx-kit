#!/usr/bin/env node

import { error } from "@rnx-kit/console";
import { isNonEmptyArray } from "@rnx-kit/tools-language/array";
import { hasProperty } from "@rnx-kit/tools-language/properties";
import { findPackageDir } from "@rnx-kit/tools-node/package";
import {
  findWorkspacePackages,
  findWorkspaceRoot,
} from "@rnx-kit/tools-workspaces";
import isString from "lodash/isString";
import * as path from "path";
import { makeCheckCommand } from "./commands/check";
import { makeInitializeCommand } from "./commands/initialize";
import { makeSetVersionCommand } from "./commands/setVersion";
import { defaultConfig } from "./config";
import { printError, printInfo } from "./errors";
import type { Args, Command } from "./types";

export const cliOptions = {
  "exclude-packages": {
    description:
      "Comma-separated list of package names to exclude from inspection.",
    type: "string",
    requiresArg: true,
  },
  init: {
    description:
      "Writes an initial kit config to the specified 'package.json'. Note that this only works for React Native packages.",
    choices: ["app", "library"],
    conflicts: ["requirements"],
  },
  loose: {
    default: false,
    description:
      "Determines how strict the React Native version requirement should be. Useful for apps that depend on a newer React Native version than their dependencies declare support for.",
    type: "boolean",
  },
  "migrate-config": {
    default: false,
    description:
      "Determines whether align-deps should try to update the config in 'package.json'.",
    type: "boolean",
  },
  presets: {
    description:
      "Comma-separated list of presets. This can be names to built-in presets, or paths to external presets.",
    type: "string",
    requiresArg: true,
  },
  requirements: {
    description:
      "Comma-separated list of requirements to apply if a package is not configured for align-deps.",
    type: "string",
    requiresArg: true,
  },
  "set-version": {
    description:
      "Sets `react-native` requirements for any configured package. There is an interactive prompt if no value is provided. The value should be a comma-separated list of `react-native` versions to set, where the first number specifies the development version. Example: `0.70,0.69`",
    type: "string",
    conflicts: ["init", "requirements"],
  },
  verbose: {
    default: false,
    description: "Increase logging verbosity",
    type: "boolean",
  },
  write: {
    default: false,
    description: "Writes changes to the specified 'package.json'.",
    type: "boolean",
  },
};

async function getManifests(
  packages: (string | number)[] | undefined
): Promise<string[] | undefined> {
  const cwd = process.cwd();
  // When positional arguments are not provided, we will get `undefined` if
  // invoked directly, and an empty array if invoked via
  // `@react-native-community/cli`.
  if (isNonEmptyArray(packages)) {
    return packages.reduce<string[]>((result, pkg) => {
      const dir = findPackageDir(pkg.toString());
      if (dir) {
        const pkgJson = path.join(dir, "package.json");
        const relativePath = path.relative(cwd, pkgJson);
        result.push(relativePath);
      }
      return result;
    }, []);
  }

  const packageDir = findPackageDir();
  if (!packageDir) {
    return undefined;
  }

  // Make sure we don't return all packages when run inside a package that just
  // happens to be part of a workspace.
  const currentPackageJson = path.join(packageDir, "package.json");
  const manifestPath = path.relative(cwd, currentPackageJson);
  try {
    if ((await findWorkspaceRoot()) !== packageDir) {
      return [manifestPath];
    }
  } catch (_) {
    return [manifestPath];
  }

  try {
    const allPackages = (await findWorkspacePackages()).map((p) =>
      path.join(path.relative(cwd, p), "package.json")
    );
    allPackages.push(manifestPath);
    return allPackages;
  } catch (e) {
    if (hasProperty(e, "message")) {
      error(e.message);
      return undefined;
    }

    throw e;
  }
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
    ["init", "set-version"],
    ["init", args.write ? "write" : "no-write"],
    ["set-version", args.write ? "write" : "no-write"],
  ];
  if (reportConflicts(conflicts, args)) {
    return undefined;
  }

  const {
    "exclude-packages": excludePackages,
    init,
    loose,
    "migrate-config": migrateConfig,
    presets,
    requirements,
    "set-version": setVersion,
    verbose,
    write,
  } = args;

  const options = {
    presets: presets?.toString()?.split(",") ?? defaultConfig.presets,
    loose,
    migrateConfig,
    verbose,
    write,
    excludePackages: excludePackages?.toString()?.split(","),
    requirements: requirements?.toString()?.split(","),
  };

  if (typeof init !== "undefined") {
    return makeInitializeCommand(init, options);
  }

  // When `--set-version` is without a value, `setVersion` is an empty string if
  // invoked directly. When invoked via `@react-native-community/cli`,
  // `setVersion` is `true` instead.
  if (setVersion || isString(setVersion)) {
    return makeSetVersionCommand(setVersion, options);
  }

  return makeCheckCommand(options);
}

export async function cli({ packages, ...args }: Args): Promise<void> {
  const command = await makeCommand(args);
  if (!command) {
    process.exitCode = 1;
    return;
  }

  const manifests = await getManifests(packages);
  if (!manifests) {
    error("Could not find package root");
    process.exitCode = 1;
    return;
  }

  // We will optimistically run through all packages regardless of failures. In
  // most scenarios, this should be fine: Both init and check+write write to
  // disk only when everything is in order for the target package. Packages with
  // invalid or missing configurations are skipped.
  const errors = manifests.reduce((errors, manifest) => {
    try {
      const result = command(manifest);
      if (result !== "success") {
        printError(manifest, result);
        return errors + 1;
      }
    } catch (e) {
      if (hasProperty(e, "message")) {
        error(`${manifest}: ${e.message}`);
        return errors + 1;
      }

      throw e;
    }
    return errors;
  }, 0);

  process.exitCode = errors;

  if (errors > 0) {
    printInfo();
  }
}

if (require.main === module) {
  require("yargs").usage(
    "$0 [packages...]",
    "Manage dependencies within a repository and across many repositories",
    cliOptions,
    cli
  ).argv;
}
