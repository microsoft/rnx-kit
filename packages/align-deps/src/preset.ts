import type { Capability } from "@rnx-kit/config";
import semverCoerce from "semver/functions/coerce";
import semverSatisfies from "semver/functions/satisfies";
import semverValidRange from "semver/ranges/valid";
import { gatherRequirements } from "./dependencies";
import { preset as reactNativePreset } from "./presets/microsoft/react-native";
import type { AlignDepsConfig, Options, Preset } from "./types";
import path from "path";
import parsePackageName from "parse-package-name";
import type { PackageInfos } from "workspace-tools";

type Resolution = {
  devPreset: Preset;
  prodPreset: Preset;
  capabilities: Capability[];
};

function loadPreset(
  preset: string,
  projectRoot: string,
  resolve = require.resolve,
  allPackages: PackageInfos
): Preset {
  switch (preset) {
    case "microsoft/react-native":
      return reactNativePreset;
    default: {
      const savePresetVal = preset;
      let check = 1;
      if(preset[0] === '/' || preset[0] === '\\') {
        check = 0;
        preset = preset.slice(1)
      }
      const parsedInfo = parsePackageName(preset);
      if(check === 0) {
        preset = savePresetVal;
      }
      if (parsedInfo.name === ".") {
        console.error("Incorrect package name in the preset field");
      }
      const info = allPackages[parsedInfo.name];
      if (info !== undefined) {
        const returnResolvedPath = path.join(path.dirname(info.packageJsonPath), parsedInfo.path);
        return require(returnResolvedPath);
      }
      else {
        return require(resolve(preset, { paths: [projectRoot] }));
      }
    }
  }
}

export function ensurePreset(preset: Preset, requirements: string[]): void {
  if (Object.keys(preset).length === 0) {
    throw new Error(
      `No profiles could satisfy requirements: ${requirements.join(", ")}`
    );
  }
}

export function parseRequirements(requirements: string[]): [string, string][] {
  return requirements.map((req) => {
    const index = req.lastIndexOf("@");
    if (index <= 0) {
      throw new Error(`Invalid requirement: ${req}`);
    }

    const name = req.substring(0, index);
    const version = req.substring(index + 1);
    if (!version || !semverValidRange(version)) {
      throw new Error(`Invalid version range in requirement: ${req}`);
    }

    return [name, version];
  });
}

/**
 * Filters out any profiles that do not satisfy the specified requirements.
 * @param preset The preset to filter
 * @param requirements The requirements that a profile must satisfy
 * @returns Preset with only profiles that satisfy the requirements
 */
export function filterPreset(preset: Preset, requirements: string[]): Preset {
  const filteredPreset: Preset = {};

  const includePrerelease = { includePrerelease: true };
  const reqs = parseRequirements(requirements);

  for (const [profileName, profile] of Object.entries(preset)) {
    const packages = Object.values(profile);
    const satisfiesRequirements = reqs.every(([pkgName, pkgVersion]) => {
      // User provided capabilities can resolve to the same package (e.g. core
      // vs core-microsoft). We will only look at the first capability to avoid
      // unexpected behaviour, e.g. due to extensions declaring an older version
      // of a package that is also declared in the built-in preset.
      const pkg = packages.find((pkg) => pkg.name === pkgName);
      if (!pkg || !("version" in pkg)) {
        return false;
      }

      const coercedVersion = semverCoerce(pkg.version);
      if (!coercedVersion) {
        throw new Error(
          `Invalid version number in '${profileName}': ${pkg.name}@${pkg.version}`
        );
      }

      return semverSatisfies(coercedVersion, pkgVersion, includePrerelease);
    });
    if (satisfiesRequirements) {
      filteredPreset[profileName] = profile;
    }
  }

  return filteredPreset;
}

/**
 * Loads and merges specified presets.
 *
 * The order of presets is significant. The profiles from each preset are merged
 * when the names overlap. If there are overlaps within the profiles, i.e. when
 * multiple profiles declare the same capability, the last profile wins. This
 * allows users to both extend and override profiles as needed.
 *
 * @param presets The presets to load and merge
 * @param projectRoot The project root from which presets should be resolved
 * @returns Merged preset
 */
export function mergePresets(
  presets: string[],
  projectRoot: string,
  allPackages: PackageInfos,
  resolve = require.resolve
): Preset {
  const mergedPreset: Preset = {};
  for (const presetName of presets) {
    const preset = loadPreset(presetName, projectRoot, resolve, allPackages);
    for (const [profileName, profile] of Object.entries(preset)) {
      mergedPreset[profileName] = {
        ...mergedPreset[profileName],
        ...profile,
      };
    }
  }

  return mergedPreset;
}



/**
 * Loads specified presets and filters them according to the requirements. The
 * list of capabilities are also gathered from transitive dependencies if
 * `kitType` is `app`.
 * @param config User input config
 * @param projectRoot Root of the project we're currently scanniing
 * @param options
 * @returns The resolved presets and capabilities
 */
export function resolve(
  { kitType, alignDeps, manifest }: AlignDepsConfig,
  projectRoot: string,
  options: Options,
  allPackages: PackageInfos
): Resolution {
  const { capabilities, presets, requirements } = alignDeps;
  
  const prodRequirements = Array.isArray(requirements)
    ? requirements
    : requirements.production;
  const mergedPreset = mergePresets(presets, projectRoot, allPackages);
  const initialProdPreset = filterPreset(mergedPreset, prodRequirements);
  ensurePreset(initialProdPreset, prodRequirements);

  const devPreset = (() => {
    if (kitType === "app") {
      // Preset for development is unused when the package is an app.
      return {};
    } else if (Array.isArray(requirements)) {
      return initialProdPreset;
    } else {
      const devRequirements = requirements.development;
      const devPreset = filterPreset(mergedPreset, devRequirements);
      ensurePreset(devPreset, devRequirements);
      return devPreset;
    }
  })();

  if (kitType === "app") {
    const { preset: prodMergedPreset, capabilities: mergedCapabilities } =
      gatherRequirements(
        projectRoot,
        manifest,
        initialProdPreset,
        prodRequirements,
        capabilities,
        options
      );
    return {
      devPreset,
      prodPreset: prodMergedPreset,
      capabilities: mergedCapabilities,
    };
  }

  return { devPreset, prodPreset: initialProdPreset, capabilities };
}
