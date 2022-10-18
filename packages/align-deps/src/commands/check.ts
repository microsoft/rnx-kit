import { info } from "@rnx-kit/console";
import { readPackage } from "@rnx-kit/tools-node/package";
import chalk from "chalk";
import { diffLinesUnified } from "jest-diff";
import * as path from "path";
import { migrateConfig } from "../compatibility/config";
import { getConfig } from "../config";
import { modifyManifest } from "../helpers";
import { updatePackageManifest } from "../manifest";
import { resolve } from "../preset";
import type { Command, ErrorCode, Options } from "../types";
import { checkPackageManifestUnconfigured } from "./vigilant";

function isError(config: ReturnType<typeof getConfig>): config is ErrorCode {
  return typeof config === "string";
}

export function checkPackageManifest(
  manifestPath: string,
  options: Options,
  inputConfig = getConfig(manifestPath)
): ErrorCode {
  if (isError(inputConfig)) {
    return inputConfig;
  }

  const config = migrateConfig(inputConfig);
  const { devPreset, prodPreset, capabilities } = resolve(
    config,
    path.dirname(manifestPath),
    options
  );
  if (capabilities.length === 0) {
    return "success";
  }

  const { kitType, manifest } = config;

  if (kitType === "app") {
    info(
      "Aligning your app's dependencies according to the following profiles:",
      Object.keys(prodPreset).join(", ")
    );
  } else {
    info(
      "Aligning your library's dependencies according to the following profiles:"
    );
    info("\t- Development:", Object.keys(devPreset).join(", "));
    info("\t- Production:", Object.keys(prodPreset).join(", "));
  }

  const updatedManifest = updatePackageManifest(
    manifest,
    capabilities,
    Object.values(prodPreset),
    Object.values(devPreset),
    kitType
  );

  // Don't fail when manifests only have whitespace differences.
  const updatedManifestJson = JSON.stringify(updatedManifest, undefined, 2);
  const normalizedManifestJson = JSON.stringify(manifest, undefined, 2);

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
    const inputConfig = getConfig(manifest);
    const config = isError(inputConfig)
      ? inputConfig
      : migrateConfig(inputConfig);

    // If the package is configured, run the normal check first.
    if (!isError(config)) {
      const result = checkPackageManifest(manifest, options, config);
      return result !== "success"
        ? result
        : checkPackageManifestUnconfigured(manifest, options, config);
    }

    // Otherwise, run the unconfigured check only.
    if (config === "not-configured") {
      return checkPackageManifestUnconfigured(manifest, options, {
        kitType: "library",
        alignDeps: {
          presets,
          requirements,
          capabilities: [],
        },
        manifest: readPackage(manifest),
      });
    }

    return config;
  };
}
