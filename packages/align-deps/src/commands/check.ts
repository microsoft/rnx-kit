import { info } from "@rnx-kit/console";
import { pickValues } from "@rnx-kit/tools-language";
import type { PackageManifest } from "@rnx-kit/tools-node/package";
import { readPackage } from "@rnx-kit/tools-node/package";
import chalk from "chalk";
import { diffLinesUnified } from "jest-diff";
import * as path from "path";
import { migrateConfig } from "../compatibility/config";
import { loadConfig, loadPresetsOverrideFromPackage } from "../config";
import { isError } from "../errors";
import { modifyManifest } from "../helpers";
import { updatePackageManifest } from "../manifest";
import { resolve } from "../preset";
import type { Command, ErrorCode, Options } from "../types";
import { checkPackageManifestUnconfigured } from "./vigilant";

const visibleKeys = [
  "name",
  "version",
  "dependencies",
  "peerDependencies",
  "devDependencies",
];

function stringify(manifest: PackageManifest): string {
  return JSON.stringify(pickValues(manifest, visibleKeys), undefined, 2);
}

export function checkPackageManifest(
  manifestPath: string,
  options: Options,
  inputConfig = loadConfig(manifestPath)
): ErrorCode {
  if (isError(inputConfig)) {
    return inputConfig;
  }

  const config = migrateConfig(inputConfig, manifestPath, options);
  const { devPreset, prodPreset, capabilities } = resolve(
    config,
    path.dirname(manifestPath),
    options
  );
  const { kitType, manifest } = config;

  if (kitType === "app" && Object.keys(prodPreset).length !== 1) {
    return "invalid-app-requirements";
  } else if (capabilities.length === 0) {
    return "success";
  }

  if (options.verbose) {
    if (kitType === "app") {
      info(
        `${manifestPath}: Aligning your app's dependencies according to the following profiles:`,
        Object.keys(prodPreset).join(", ")
      );
    } else {
      info(
        `${manifestPath}: Aligning your library's dependencies according to the following profiles:\n` +
          `\t- Development: ${Object.keys(devPreset).join(", ")}\n` +
          `\t- Production: ${Object.keys(prodPreset).join(", ")}`
      );
    }
  }

  const updatedManifest = updatePackageManifest(
    manifestPath,
    manifest,
    capabilities,
    prodPreset,
    devPreset,
    kitType
  );

  // Don't fail when manifests only have whitespace differences.
  const updatedManifestJson = stringify(updatedManifest);
  const normalizedManifestJson = stringify(manifest);

  if (updatedManifestJson !== normalizedManifestJson) {
    if (options.write) {
      modifyManifest(manifestPath, updatedManifest);
    } else {
      const diff = diffLinesUnified(
        normalizedManifestJson.split("\n"),
        updatedManifestJson.split("\n"),
        {
          aAnnotation: "Current",
          aColor: chalk.red,
          bAnnotation: "Expected",
          bColor: chalk.green,
        }
      );
      console.log(diff);
      return "unsatisfied";
    }
  }

  return "success";
}

export function makeCheckCommand(options: Options): Command {
  const { presets, requirements } = options;
  if (!requirements) {
    return (manifest: string) => checkPackageManifest(manifest, options);
  }

  return (manifest: string) => {
    const inputConfig = loadConfig(manifest, "vigilant");
    const config = isError(inputConfig)
      ? inputConfig
      : migrateConfig(inputConfig, manifest, options);

    // If the package is configured, run the normal check first.
    if (!isError(config)) {
      const result = checkPackageManifest(manifest, options, config);
      return result !== "success"
        ? result
        : checkPackageManifestUnconfigured(manifest, options, config);
    }

    // Otherwise, run the unconfigured check only.
    if (config === "invalid-configuration" || config === "not-configured") {
      // In "vigilant" mode, we allow packages to declare which presets should
      // be used in config, overriding the `--presets` flag.
      const presetsOverride = loadPresetsOverrideFromPackage(manifest);
      return checkPackageManifestUnconfigured(manifest, options, {
        kitType: "library",
        alignDeps: {
          presets: presetsOverride || presets,
          requirements,
          capabilities: [],
        },
        manifest: readPackage(manifest),
      });
    }

    return config;
  };
}
