#!/usr/bin/env node

import { error, warn } from "@rnx-kit/console";
import { hasProperty } from "@rnx-kit/tools-language/properties";
import { findPackageDir } from "@rnx-kit/tools-node/package";
import {
  findWorkspacePackages,
  findWorkspaceRoot,
} from "@rnx-kit/tools-workspaces";
import * as fs from "node:fs";
import * as path from "node:path";
import { makeCheckCommand } from "./commands/check.ts";
import { makeExportCatalogsCommand } from "./commands/exportCatalogs.ts";
import { makeInitializeCommand } from "./commands/initialize.ts";
import { makeSetVersionCommand } from "./commands/setVersion.ts";
import { defaultConfig } from "./config.ts";
import { printError, printInfo } from "./errors.ts";
import { isEmptyArray, isString } from "./helpers.ts";
import type { Args, Command, DiffMode } from "./types.ts";

export const description =
  "Manage dependencies within a repository and across many repositories";

export const cliOptions = {
  "check-overrides": {
    default: false,
    description:
      "Warns when 'resolutions'/'overrides' pin a managed dependency to a version that is outside the profiles satisfying '--requirements', or the configuration of the package declaring them. This check never modifies the manifest.",
    type: "boolean",
  },
  "diff-mode": {
    default: "strict",
    description:
      "Sets the algorithm used to determine if versions differ. Valid values are 'strict' (version strings must be equal) and 'allow-subset' (allow version ranges that are a subset).",
    choices: ["strict", "allow-subset"],
  },
  "exclude-packages": {
    description:
      "Comma-separated list of package names to exclude from inspection.",
    type: "string",
    requiresArg: true,
    argsString: "<packages>", // Used by Commander
  },
  "export-catalogs": {
    description: "Exports catalogs for use with pnpm or Yarn.",
    type: "string",
    conflicts: ["init", "requirements", "set-version"],
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
  "no-unmanaged": {
    default: false,
    description:
      "Determines whether align-deps should treat unmanaged capabilities as errors.",
    type: "boolean",
  },
  presets: {
    description:
      "Comma-separated list of presets. This can be names to built-in presets, or paths to external presets.",
    type: "string",
    requiresArg: true,
    argsString: "<presets>", // Used by Commander
  },
  requirements: {
    description:
      "Comma-separated list of requirements to apply if a package is not configured for align-deps.",
    type: "string",
    requiresArg: true,
    argsString: "<requirements>", // Used by Commander
  },
  "set-version": {
    description:
      "Sets `react-native` requirements for any configured package. There is an interactive prompt if no value is provided. The value should be a comma-separated list of `react-native` versions to set, where the first number specifies the development version. Example: `0.70,0.69`",
    type: "string",
    conflicts: ["init", "requirements"],
    argsString: "[versions]", // Used by Commander
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
): Promise<[string[], string | undefined] | undefined> {
  const cwd = process.cwd();
  // When positional arguments are not provided, we will get `undefined` if
  // invoked directly, and an empty array if invoked via
  // `@react-native-community/cli`.
  if (!isEmptyArray(packages)) {
    const manifests = packages.reduce<string[]>((result, input) => {
      const pkg = input.toString();
      if (!fs.existsSync(pkg)) {
        error(`${pkg}: No such file or directory`);
        return result;
      }

      const dir = findPackageDir(pkg);
      if (dir) {
        const pkgJson = path.join(dir, "package.json");
        const relativePath = path.relative(cwd, pkgJson);
        result.push(relativePath);
      }
      return result;
    }, []);

    // We ignore `--check-overrides` here otherwise we would have to try to
    // resolve workspace root for each package.
    return manifests.length === 0 ? undefined : [manifests, undefined];
  }

  const packageDir = findPackageDir();
  if (!packageDir) {
    error("Could not find package root");
    return undefined;
  }

  // Make sure we don't return all packages when run inside a package that just
  // happens to be part of a workspace.
  const currentPackageJson = path.join(packageDir, "package.json");
  const manifestPath = path.relative(cwd, currentPackageJson);
  try {
    const root = await findWorkspaceRoot();
    if (!root) {
      return [[manifestPath], manifestPath];
    } else if (root !== packageDir) {
      return [[manifestPath], undefined];
    }
  } catch (_) {
    return [[manifestPath], manifestPath];
  }

  try {
    const allPackages = (await findWorkspacePackages()).map((p) =>
      path.join(path.relative(cwd, p), "package.json")
    );
    // Add the root workspace if it isn't there
    if (!allPackages.includes(manifestPath)) {
      allPackages.push(manifestPath);
    }
    return [allPackages, manifestPath];
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

function validateDiffMode(mode: string | undefined): DiffMode {
  switch (mode) {
    case "allow-subset":
    case "strict":
      return mode;
    default:
      if (mode) {
        warn("Unknown diff mode:", mode);
      }
      return "strict";
  }
}

async function makeCommand(args: Args): Promise<Command | undefined> {
  const conflicts: [string, string][] = [
    ["export-catalogs", "init"],
    ["export-catalogs", "set-version"],
    ["init", "set-version"],
    ["init", args.write ? "write" : "no-write"],
    ["set-version", args.write ? "write" : "no-write"],
  ];
  if (reportConflicts(conflicts, args)) {
    return undefined;
  }

  const {
    "check-overrides": checkOverrides,
    "diff-mode": diffMode,
    "exclude-packages": excludePackages,
    "export-catalogs": exportCatalogs,
    init,
    loose,
    "migrate-config": migrateConfig,
    "no-unmanaged": noUnmanaged,
    packages,
    presets,
    requirements,
    "set-version": setVersion,
    verbose,
    write,
  } = args;
  if (checkOverrides && !isEmptyArray(packages)) {
    warn("`--check-overrides` is ignored if packages are specified");
  }

  const options = {
    presets: presets?.toString()?.split(",") ?? defaultConfig.presets,
    checkOverrides,
    loose,
    migrateConfig,
    noUnmanaged,
    verbose,
    write,
    diffMode: validateDiffMode(diffMode),
    excludePackages: excludePackages?.toString()?.split(","),
    requirements: requirements?.toString()?.split(","),
  };

  if (typeof exportCatalogs === "string") {
    return makeExportCatalogsCommand({
      exportCatalogs,
      presets: options.presets,
    });
  }

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

export async function cli(args: Args): Promise<void> {
  const command = await makeCommand(args);
  if (!command) {
    process.exitCode = 1;
    return;
  }

  if (command.isRootCommand) {
    process.exitCode = command() === "success" ? 0 : 1;
    return;
  }

  const result = await getManifests(args.packages);
  if (!result) {
    process.exitCode = 1;
    return;
  }

  const [manifests, rootManifest] = result;

  // We will optimistically run through all packages regardless of failures. In
  // most scenarios, this should be fine: Both init and check+write write to
  // disk only when everything is in order for the target package. Packages with
  // invalid or missing configurations are skipped.
  const errors = manifests.reduce((errors, manifest) => {
    try {
      const result = command(manifest);
      printError(manifest, result);
      if (result !== "success" && result !== "excluded") {
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

  if (rootManifest && command.finalize) {
    try {
      command.finalize(rootManifest);
    } catch (e) {
      warn(`${rootManifest}: could not check overrides: ${e}`);
    }
  }

  process.exitCode = errors;

  if (errors > 0) {
    printInfo();
  }
}

if (require.main === module) {
  require("yargs")
    .parserConfiguration({ "boolean-negation": false })
    .usage("$0 [packages...]", description, cliOptions, cli)
    .parse();
}
