import semverCoerce from "semver/functions/coerce";
import semverSatisfies from "semver/functions/satisfies";
import type { MetaPackage, Package, Preset } from "./types";

function compileRequirements(
  requirements: string[]
): ((pkg: MetaPackage | Package) => boolean)[] {
  const includePrerelease = { includePrerelease: true };
  return requirements.map((req) => {
    const [requiredPackage, requiredVersionRange] = req.split("@");
    return (pkg: MetaPackage | Package) => {
      return (
        pkg.name === requiredPackage &&
        "version" in pkg &&
        semverSatisfies(
          semverCoerce(pkg.version) || "0.0.1",
          requiredVersionRange,
          includePrerelease
        )
      );
    };
  });
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
