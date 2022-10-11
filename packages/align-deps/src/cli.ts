#!/usr/bin/env node

import { error } from "@rnx-kit/console";
import { hasProperty } from "@rnx-kit/tools-language/properties";
import { findPackageDir } from "@rnx-kit/tools-node/package";
import {
  findWorkspacePackages,
  findWorkspaceRoot,
} from "@rnx-kit/tools-workspaces";
import * as path from "path";
import { makeCheckCommand } from "./commands/check";
import { printError } from "./errors";
import type { Args, Command } from "./types";

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
    loose,
    presets,
    requirements,
    write,
  } = args;

  return makeCheckCommand({
    loose,
    write,
    excludePackages: excludePackages?.toString()?.split(","),
    presets: presets?.toString()?.split(","),
    requirements: requirements?.toString()?.split(","),
  });
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
        const currentPackageJson = path.relative(process.cwd(), manifest);
        error(`${currentPackageJson}: ${e.message}`);
        return errors + 1;
      }

      throw e;
    }
    return errors;
  }, 0);

  process.exitCode = errors;
}

if (require.main === module) {
  require("yargs").usage(
    "$0 [packages...]",
    "Dependency checker for npm packages",
    {
      "exclude-packages": {
        description:
          "Comma-separated list of package names to exclude from inspection.",
        type: "string",
        requiresArg: true,
      },
      loose: {
        default: false,
        description:
          "Determines how strict the React Native version requirement should be. Useful for apps that depend on a newer React Native version than their dependencies declare support for.",
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
      write: {
        default: false,
        description: "Writes changes to the specified 'package.json'.",
        type: "boolean",
      },
    },
    cli
  ).argv;
}
