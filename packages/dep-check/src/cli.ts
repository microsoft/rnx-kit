#!/usr/bin/env node

import * as path from "path";
import pkgDir from "pkg-dir";
import { getAllPackageJsonFiles, getWorkspaceRoot } from "workspace-tools";
import yargs from "yargs";
import { checkPackageManifest } from "./check";
import { error } from "./console";
import { initializeConfig } from "./initialize";
import type { Args, Command } from "./types";
import { makeVigilantCommand } from "./vigilant";

function getManifests(
  packageJson: string | number | undefined
): string[] | undefined {
  if (typeof packageJson === "string" && packageJson) {
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

function makeInitializeCommand(kitType: string): Command {
  return (manifest: string) => {
    initializeConfig(manifest, { kitType });
    return 0;
  };
}

function makeCommand({
  "custom-profiles": customProfiles,
  init,
  vigilant,
  write,
}: Args): Command | undefined {
  if (init && vigilant) {
    error("--init and --vigilant cannot both be specified at the same time.");
    process.exit(1);
  } else if (init && write) {
    error("--init and --write cannot both be specified at the same time.");
    process.exit(1);
  }

  if (init) {
    return makeInitializeCommand(init);
  }

  if (vigilant) {
    return makeVigilantCommand(vigilant, write, customProfiles);
  }

  return makeCheckCommand(write);
}

export function cli({ "package-json": packageJson, ...args }: Args): void {
  const command = makeCommand(args);
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
        description: "Path to custom profiles.",
        type: "string",
      },
      init: {
        description:
          "Writes an initial kit config to the specified 'package.json'.",
        choices: ["app", "library"],
      },
      vigilant: {
        description: "Enter vigilant mode.",
        type: "string",
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
