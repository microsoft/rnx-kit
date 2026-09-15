import { getKitConfigFromPackageManifest } from "@rnx-kit/config";
import { keysOf } from "@rnx-kit/tools-language/properties";
import type { Capability } from "@rnx-kit/types-kit-config";
import * as path from "node:path";
import { isMetaPackage } from "../capabilities.ts";
import { transformConfig } from "../compatibility/config.ts";
import { loadConfig, sanitizeCapabilities } from "../config.ts";
import { visitDependencies } from "../dependencies.ts";
import { isError } from "../errors.ts";
import { filterPreset, mergePresets } from "../preset.ts";
import type { Command, Options, Profile } from "../types.ts";

function requiresPackage(
  capability: Capability,
  profile: Profile,
  name: string,
  visited = new Set<string>(["__proto__", "constructor", "prototype"])
): boolean {
  if (visited.has(capability)) {
    return false;
  }
  visited.add(capability);

  const pkg = profile[capability];
  return Boolean(
    pkg &&
    ((!isMetaPackage(pkg) && pkg.name === name) ||
      pkg.capabilities?.some((child) =>
        requiresPackage(child, profile, name, visited)
      ))
  );
}

export function makeWhyCommand(name: string, options: Options): Command {
  return (manifestPath) => {
    const inputConfig = loadConfig(manifestPath, options);
    if (isError(inputConfig)) {
      return inputConfig;
    }

    // Transform legacy config in memory only, even with --migrate-config.
    const config =
      "alignDeps" in inputConfig ? inputConfig : transformConfig(inputConfig);
    const { manifest, kitType, alignDeps } = config;
    const projectRoot = path.resolve(path.dirname(manifestPath));
    const { capabilities, requirements } = alignDeps;
    const preset = mergePresets(alignDeps.presets, projectRoot);
    const profiles = Object.values(
      filterPreset(
        preset,
        Array.isArray(requirements) ? requirements : requirements.production
      )
    );
    if (kitType !== "app" && !Array.isArray(requirements)) {
      profiles.push(
        ...Object.values(filterPreset(preset, requirements.development))
      );
    }
    const matching = new Set<Capability>();
    for (const profile of profiles) {
      for (const capability of keysOf(profile)) {
        if (requiresPackage(capability, profile, name)) {
          matching.add(capability);
        }
      }
    }
    if (matching.size === 0) {
      return "success";
    }

    const reasons = new Map<string, Set<Capability>>();
    const collect = (module: string, capabilities?: Capability[]) => {
      const found = sanitizeCapabilities(capabilities).filter((capability) =>
        matching.has(capability)
      );
      if (found.length > 0) {
        reasons.set(
          module,
          new Set([...(reasons.get(module) ?? []), ...found])
        );
      }
    };

    collect(manifest.name, capabilities);
    visitDependencies(manifest, projectRoot, (module, modulePath, manifest) => {
      const config = getKitConfigFromPackageManifest(manifest, modulePath);
      collect(module, config?.alignDeps?.capabilities ?? config?.capabilities);
    });

    for (const [index, [module, capabilities]] of [...reasons].entries()) {
      const last = index === reasons.size - 1;
      console.log(`${last ? "└" : "├"}─ ${module}`);
      console.log(
        `${last ? " " : "│"}  └─ ${name} (via ${[...capabilities].map((c) => `'${c}'`).join(", ")})`
      );
      if (!last) {
        console.log("│");
      }
    }
    return "success";
  };
}
