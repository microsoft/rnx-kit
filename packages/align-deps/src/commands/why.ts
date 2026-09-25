import { getKitConfigFromPackageManifest } from "@rnx-kit/config";
import { keysOf } from "@rnx-kit/tools-language/properties";
import type { Capability } from "@rnx-kit/types-kit-config";
import * as path from "node:path";
import { loadConfig, sanitizeCapabilities } from "../config.ts";
import { visitDependencies } from "../dependencies.ts";
import { isError } from "../errors.ts";
import { isEmptyArray, makeVisitorSet } from "../helpers.ts";
import { filterPreset, mergePresets } from "../preset.ts";
import type {
  AlignDepsOptions,
  Command,
  Options,
  Preset,
  Profile,
} from "../types.ts";

function requiresPackage(
  name: string,
  capability: Capability,
  profile: Profile,
  visited = makeVisitorSet()
): boolean {
  if (visited.has(capability)) {
    return false;
  }

  visited.add(capability);

  const pkg = profile[capability];
  if (!pkg) {
    return false;
  }

  return Boolean(
    pkg.name === name ||
    pkg.capabilities?.some((child) =>
      requiresPackage(name, child, profile, visited)
    )
  );
}

function capabilitiesForPackage(
  name: string,
  preset: Preset,
  requirements: AlignDepsOptions["alignDeps"]["requirements"]
): Set<Capability> {
  const matches = new Set<Capability>();

  const allReqs = Array.isArray(requirements)
    ? [requirements]
    : [requirements.production, requirements.development];

  for (const req of allReqs) {
    for (const profile of Object.values(filterPreset(preset, req))) {
      for (const capability of keysOf(profile)) {
        if (requiresPackage(name, capability, profile)) {
          matches.add(capability);
        }
      }
    }
  }

  return matches;
}

export function makeWhyCommand(name: string, options: Options): Command {
  return (manifestPath: string) => {
    const inputConfig = loadConfig(manifestPath, options);
    if (isError(inputConfig)) {
      return inputConfig;
    }

    const { alignDeps, manifest } = inputConfig;
    const { presets, requirements, capabilities } = alignDeps;

    const projectRoot = path.resolve(path.dirname(manifestPath));
    const preset = mergePresets(presets, projectRoot);

    const matches = capabilitiesForPackage(name, preset, requirements);
    if (matches.size === 0) {
      return "success";
    }

    const reasons = new Map<string, Capability[]>();
    const collect = (module: string, capabilities?: Capability[]) => {
      if (isEmptyArray(capabilities)) {
        return;
      }

      // Multiple installations of the same package may declare different
      // capabilities. Merge them under a single entry.
      const found = new Set<Capability>(reasons.get(module));
      for (const capability of sanitizeCapabilities(capabilities)) {
        if (matches.has(capability)) {
          found.add(capability);
        }
      }
      if (found.size > 0) {
        reasons.set(module, Array.from(found));
      }
    };

    collect(manifest.name, capabilities);
    visitDependencies(manifest, projectRoot, (module, modulePath, manifest) => {
      const config = getKitConfigFromPackageManifest(manifest, modulePath);
      collect(module, config?.alignDeps?.capabilities);
    });

    const size = reasons.size;
    if (size > 0) {
      const entries = reasons.entries();
      for (let i = 0; i < size; ++i) {
        const { value } = entries.next();
        if (!value) {
          continue;
        }

        const [module, capabilities] = value;
        const last = i === size - 1;
        console.log(`${last ? "└" : "├"}─ ${module}`);
        console.log(
          `${last ? " " : "│"}  └─ ${name} (via '${capabilities.join("', '")}')`
        );
        if (!last) {
          console.log("│");
        }
      }
    }

    return "success";
  };
}
