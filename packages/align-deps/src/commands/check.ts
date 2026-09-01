import { keysOf } from "@rnx-kit/tools-language/properties";
import { readPackage } from "@rnx-kit/tools-node/package";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { resolveCapabilitiesUnchecked } from "../capabilities.ts";
import { migrateConfig } from "../compatibility/config.ts";
import { loadConfig } from "../config.ts";
import { diff, stringify } from "../diff.ts";
import { isError } from "../errors.ts";
import { modifyManifest } from "../helpers.ts";
import { updatePackageManifest } from "../manifest.ts";
import { resolve } from "../preset.ts";
import { makeDefaultReporter, withGroupReporter } from "../reporter.ts";
import type {
  CapabilityRequirements,
  Command,
  ErrorCode,
  Options,
  Preset,
} from "../types.ts";
import { checkPackageManifestUnconfigured } from "./vigilant.ts";

/**
 * Maps each resolved dependency to the list of packages that required it.
 *
 * A dependency is added because it satisfies one or more capabilities, and each
 * capability is required by one or more packages. This resolves each required
 * capability (including nested capabilities provided by meta packages) to real
 * dependencies, then attributes the requiring packages to those dependencies.
 *
 * @param capabilityRequirements Map of capability to the packages requiring it
 * @param presets The presets used to resolve capabilities to dependencies
 * @returns A map of dependency name to the packages that required it
 */
function dependencyReasons(
  capabilityRequirements: CapabilityRequirements,
  presets: Preset[]
): Record<string, string[]> {
  const reasons: Record<string, Set<string>> = {};
  for (const capability of keysOf(capabilityRequirements)) {
    const packages = capabilityRequirements[capability];
    if (!packages) {
      continue;
    }
    for (const preset of presets) {
      const { dependencies } = resolveCapabilitiesUnchecked(
        [capability],
        preset
      );
      for (const dependency of Object.keys(dependencies)) {
        const set = (reasons[dependency] ??= new Set<string>());
        for (const pkg of packages) {
          set.add(pkg);
        }
      }
    }
  }

  return Object.fromEntries(
    Object.entries(reasons).map(([dependency, packages]) => [
      dependency,
      Array.from(packages).sort(),
    ])
  );
}

/**
 * Checks the specified package manifest for misaligned dependencies.
 *
 * There are essentially two modes of operation depending on whether the package
 * is an app or a library.
 *
 * - For libraries, only dependencies that are declared under capabilities are
 *   checked. `align-deps` will ensure that `peerDependencies` and
 *   `devDependencies` are correctly used to satisfy the declared capabilities.
 * - For apps, its dependencies and the dependencies of its dependencies are
 *   checked. `align-deps` will ensure that `dependencies` and `devDependencies`
 *   are correctly used to satisfy the declared capabilities. Additionally,
 *   requirements may only resolve to a single profile. If multiple profiles
 *   satisfy the requirements, the command will fail.
 *
 * Note that this function mutates the manifest when `write` is `true`.
 *
 * @see {@link updatePackageManifest}
 *
 * @param manifestPath Path to the package manifest to check
 * @param options Command line options
 * @param inputConfig Configuration in the package manifest
 * @param logError Function for outputting changes
 * @returns `success` when everything is in order; an {@link ErrorCode} otherwise
 */
export function checkPackageManifest(
  manifestPath: string,
  options: Options,
  inputConfig = loadConfig(manifestPath, options),
  reporter = makeDefaultReporter(manifestPath),
  /** @internal */ fs = nodefs
): ErrorCode {
  if (isError(inputConfig)) {
    return inputConfig;
  }

  const config = migrateConfig(inputConfig, manifestPath, options);
  const { devPreset, prodPreset, capabilities, capabilityRequirements } =
    resolve(config, path.dirname(manifestPath), options);
  const { kitType, manifest } = config;

  if (kitType === "app" && Object.keys(prodPreset).length !== 1) {
    return "invalid-app-requirements";
  } else if (capabilities.length === 0) {
    return "success";
  }

  if (options.verbose) {
    if (kitType === "app") {
      reporter.info(
        `${manifestPath}: profiles resolved for the app: ${Object.keys(prodPreset).join(", ")}`
      );
    } else {
      reporter.info(
        `${manifestPath}: profiles resolved for the library:\n` +
          `     ├── Development: ${Object.keys(devPreset).join(", ")}\n` +
          `     └── Production: ${Object.keys(prodPreset).join(", ")}`
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

  const allChanges = diff(manifest, updatedManifest, options);
  if (allChanges) {
    if (options.write) {
      // The config object may be passed to other commands, so we need to
      // update it in-place to ensure consistency.
      inputConfig.manifest = updatedManifest;
      modifyManifest(manifestPath, updatedManifest, fs);
    } else {
      const reasons = options.why
        ? dependencyReasons(capabilityRequirements, [prodPreset, devPreset])
        : undefined;
      const violations = stringify(allChanges, [manifestPath], reasons);
      reporter.error(violations);
      return "unsatisfied";
    }
  }

  return "success";
}

/**
 * Creates the check command. This is the default command no other flags are
 * specified.
 *
 * In normal mode, `align-deps` will only check packages that have a
 * configuration, and only listed capabilities.
 *
 * In vigilant mode, `align-deps` will check all packages in the workspace,
 * regardless of whether they have a configuration. For packages that do have a
 * configuration, the listed capabilities will be checked first as usual. The
 * remaining capabilities will then be checked, but are treated as unconfigured.
 *
 * @see {@link checkPackageManifest}
 * @see {@link checkPackageManifestUnconfigured}
 *
 * @param options Command line options
 * @returns The check command
 */
export function makeCheckCommand(options: Options): Command {
  const { presets, requirements } = options;
  if (!requirements) {
    return (manifest: string) => checkPackageManifest(manifest, options);
  }

  return (manifestPath: string) => {
    const manifest = readPackage(manifestPath);
    const inputConfig = loadConfig({ path: manifestPath, manifest }, options);
    const config = isError(inputConfig)
      ? inputConfig
      : migrateConfig(inputConfig, manifestPath, options);

    // If the package is configured, run the normal check first.
    if (!isError(config)) {
      return withGroupReporter(manifestPath, (reporter) => {
        const res1 = checkPackageManifest(
          manifestPath,
          options,
          config,
          reporter
        );
        const res2 = checkPackageManifestUnconfigured(
          manifestPath,
          options,
          config,
          reporter
        );
        return res1 !== "success" ? res1 : res2;
      });
    }

    // Otherwise, run the unconfigured check only.
    if (config === "invalid-configuration" || config === "not-configured") {
      // In "vigilant" mode, we allow packages to declare which presets should
      // be used in config, overriding the `--presets` flag.
      return withGroupReporter(manifestPath, (reporter) => {
        return checkPackageManifestUnconfigured(
          manifestPath,
          options,
          {
            kitType: "library",
            alignDeps: {
              presets,
              requirements,
              capabilities: [],
            },
            manifest,
          },
          reporter
        );
      });
    }

    return config;
  };
}
