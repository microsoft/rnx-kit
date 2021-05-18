#!/usr/bin/env node

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

export function cli({ init, write, "package-json": packageJson }: Args): void {
  if (init && write) {
    error("--init and --write cannot both be specified at the same time.");
    process.exit(1);
  }

  const packageManifest = (() => {
    if (typeof packageJson === "string") {
      return packageJson;
    }

    const packageDir = pkgDir.sync();
    if (packageDir) {
      return path.join(packageDir, "package.json");
    }

    return undefined;
  })();
  if (!packageManifest) {
    error("Could not find package manifest");
    process.exit(1);
  }

  if (init) {
    initializeConfig(packageManifest, init);
    process.exit(0);
  }

  const exitCode = checkPackageManifest(packageManifest, { write });
  process.exit(exitCode);
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
