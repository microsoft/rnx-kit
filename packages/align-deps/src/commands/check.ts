import type { KitConfig } from "@rnx-kit/config";
import { getKitCapabilities, getKitConfig } from "@rnx-kit/config";
import { error, info, warn } from "@rnx-kit/console";
import { isPackageManifest, readPackage } from "@rnx-kit/tools-node/package";
import chalk from "chalk";
import { diffLinesUnified } from "jest-diff";
import * as path from "path";
import { migrateConfig } from "../compatibility/config";
import { findBadPackages } from "../findBadPackages";
import { modifyManifest } from "../helpers";
import { updatePackageManifest } from "../manifest";
import { resolve } from "../preset";
import type {
  AlignDepsConfig,
  CheckConfig,
  Command,
  ErrorCode,
  Options,
} from "../types";
import { checkPackageManifestUnconfigured } from "./vigilant";

type ConfigResult = AlignDepsConfig | CheckConfig | ErrorCode;

const defaultConfig: AlignDepsConfig["alignDeps"] = {
  presets: ["microsoft/react-native"],
  requirements: [],
  capabilities: [],
};

export function containsValidPresets(config: KitConfig["alignDeps"]): boolean {
  const presets = config?.presets;
  return !presets || (Array.isArray(presets) && presets.length > 0);
}

export function containsValidRequirements(
  config: KitConfig["alignDeps"]
): boolean {
  const requirements = config?.requirements;
  if (requirements) {
    if (Array.isArray(requirements)) {
      return requirements.length > 0;
    } else if (typeof requirements === "object") {
      return (
        Array.isArray(requirements.production) &&
        requirements.production.length > 0
      );
    }
  }
  return false;
}

function getConfig(manifestPath: string): ConfigResult {
  const manifest = readPackage(manifestPath);
  if (!isPackageManifest(manifest)) {
    return "invalid-manifest";
  }

  const badPackages = findBadPackages(manifest);
  if (badPackages) {
    warn(
      `Known bad packages are found in '${manifest.name}':\n` +
        badPackages
          .map((pkg) => `\t${pkg.name}@${pkg.version}: ${pkg.reason}`)
          .join("\n")
    );
  }

  const projectRoot = path.dirname(manifestPath);
  const kitConfig = getKitConfig({ cwd: projectRoot });
  if (!kitConfig) {
    return "not-configured";
  }

  const { kitType = "library", alignDeps, ...config } = kitConfig;
  if (alignDeps) {
    const errors = [];
    if (!containsValidPresets(alignDeps)) {
      errors.push(`${manifestPath}: 'alignDeps.presets' cannot be empty`);
    }
    if (!containsValidRequirements(alignDeps)) {
      errors.push(`${manifestPath}: 'alignDeps.requirements' cannot be empty`);
    }
    if (errors.length > 0) {
      for (const e of errors) {
        error(e);
      }
      return "invalid-configuration";
    }
    return {
      kitType,
      alignDeps: {
        ...defaultConfig,
        ...alignDeps,
      },
      ...config,
      manifest,
    };
  }

  const {
    capabilities,
    customProfiles,
    reactNativeDevVersion,
    reactNativeVersion,
  } = getKitCapabilities(config);

  return {
    kitType,
    reactNativeVersion,
    ...(config.reactNativeDevVersion ? { reactNativeDevVersion } : undefined),
    capabilities,
    customProfiles,
    manifest,
  } as CheckConfig;
}

function isError(config: ConfigResult): config is ErrorCode {
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
  const { presets = defaultConfig.presets, requirements } = options;
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
