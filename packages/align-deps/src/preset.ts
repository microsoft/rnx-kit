import type { Capability } from "@rnx-kit/config";
import semverCoerce from "semver/functions/coerce";
import semverSatisfies from "semver/functions/satisfies";
import { gatherRequirements } from "./dependencies";
import type {
  AlignDepsConfig,
  MetaPackage,
  Options,
  Package,
  Preset,
} from "./types";

type Resolution = {
  devPreset: Preset;
  prodPreset: Preset;
  capabilities: Capability[];
};

function compileRequirements(
  requirements: string[]
): ((pkg: MetaPackage | Package) => boolean)[] {
  const includePrerelease = { includePrerelease: true };
  return requirements.map((req) => {
    const [requiredPackage, requiredVersionRange] = req.split("@");
    return (pkg: MetaPackage | Package) => {
      if (pkg.name !== requiredPackage || !("version" in pkg)) {
        return false;
      }

      const coercedVersion = semverCoerce(pkg.version);
      if (!coercedVersion) {
        throw new Error(`Invalid version number: ${pkg.name}@${pkg.version}`);
      }

      return semverSatisfies(
        coercedVersion,
        requiredVersionRange,
        includePrerelease
      );
    };
  });
}

function ensurePreset(preset: Preset, requirements: string[]): void {
  if (Object.keys(preset).length === 0) {
    throw new Error(
      `No profiles could satisfy requirements: ${requirements.join(", ")}`
    );
  }
}

function loadPreset(preset: string, projectRoot: string): Preset {
  try {
    return require("./presets/" + preset).default;
  } catch (_) {
    return require(require.resolve(preset, { paths: [projectRoot] }));
  }
}

export function filterPreset(requirements: string[], preset: Preset): Preset {
  const filteredPreset: Preset = {};
  const reqs = compileRequirements(requirements);
  for (const [profileName, profile] of Object.entries(preset)) {
    // FIXME: Some capabilities can resolve to the same package (e.g. core vs core-microsoft)
    const packages = Object.values(profile);
    const satisfiesRequirements = reqs.every((predicate) =>
      packages.some(predicate)
    );
    if (satisfiesRequirements) {
      filteredPreset[profileName] = profile;
    }
  }

  return filteredPreset;
}

export function mergePresets(presets: string[], projectRoot: string): Preset {
  const mergedPreset: Preset = {};
  for (const presetName of presets) {
    const preset = loadPreset(presetName, projectRoot);
    for (const [profileName, profile] of Object.entries(preset)) {
      mergedPreset[profileName] = {
        ...mergedPreset[profileName],
        ...profile,
      };
    }
  }

  return mergedPreset;
}

export function resolve(
  { kitType, alignDeps, manifest }: AlignDepsConfig,
  projectRoot: string,
  options: Options
): Resolution {
  const { capabilities, presets, requirements } = alignDeps;

  const prodRequirements = Array.isArray(requirements)
    ? requirements
    : requirements.production;
  const mergedPreset = mergePresets(presets, projectRoot);
  const initialProdPreset = filterPreset(prodRequirements, mergedPreset);
  ensurePreset(initialProdPreset, prodRequirements);

  const devPreset = (() => {
    if (kitType === "app") {
      // Preset for development is unused when the package is an app.
      return {};
    } else if (Array.isArray(requirements)) {
      return initialProdPreset;
    } else {
      const devRequirements = requirements.development;
      const devPreset = filterPreset(devRequirements, mergedPreset);
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
