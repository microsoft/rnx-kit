#!/usr/bin/env node

import { getPackagesSync } from "@manypkg/get-packages";
import path from "path";
import pkgDir from "pkg-dir";
import yargs from "yargs";
import { checkPackageManifest } from "./check";
import { error } from "./console";
import { initializeConfig } from "./initialize";

export type Args = {
  init?: string;
  write: boolean;
  "package-json"?: string | number;
};

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

  try {
    const { packages } = getPackagesSync(packageDir);
    return packages.map((pkg) => path.join(pkg.dir, "package.json"));
  } catch (e) {
    error(e.message);
    return undefined;
  }
}

export function cli({ init, write, "package-json": packageJson }: Args): void {
  if (init && write) {
    error("--init and --write cannot both be specified at the same time.");
    process.exit(1);
  }

  const manifests = getManifests(packageJson);
  if (!manifests) {
    error("Could not find package root");
    process.exit(1);
  }

  const func: (exitCode: number, manifest: string) => number = (() => {
    if (init) {
      return (exitCode: number, manifest: string) => {
        initializeConfig(manifest, init);
        return exitCode;
      };
    }

    return (exitCode: number, manifest: string) => {
      return checkPackageManifest(manifest, { write }) || exitCode;
    };
  })();

  process.exit(manifests.reduce(func, 0));
}

if (require.main === module) {
  yargs.usage(
    "$0 [package-json]",
    "Dependency checker for React Native apps",
    {
      init: {
        description:
          "Writes an initial kit config to the specified 'package.json'.",
        choices: ["app", "library"],
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
