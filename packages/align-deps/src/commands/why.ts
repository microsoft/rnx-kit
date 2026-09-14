import { getKitConfigFromPackageManifest } from "@rnx-kit/config";
import type { Capability } from "@rnx-kit/types-kit-config";
import * as path from "node:path";
import { isMetaPackage } from "../capabilities.ts";
import { transformConfig } from "../compatibility/config.ts";
import { loadConfig, sanitizeCapabilities } from "../config.ts";
import {
  getRequirements,
  isCoreCapability,
  isDevOnlyCapability,
  visitDependencies,
} from "../dependencies.ts";
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
  const matchingCapabilities = new WeakMap<Profile, Map<Capability, boolean>>();
  const matches = (capability: Capability, profile: Profile) => {
    let matching = matchingCapabilities.get(profile);
    if (!matching) {
      matching = new Map();
      matchingCapabilities.set(profile, matching);
    }
    const result =
      matching.get(capability) ?? requiresPackage(capability, profile, name);
    matching.set(capability, result);
    return result;
  };

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
    const preset = mergePresets(alignDeps.presets, projectRoot);
    const { requirements, capabilities } = alignDeps;
    const prodPreset = filterPreset(
      preset,
      Array.isArray(requirements) ? requirements : requirements.production
    );
    const prodProfiles = Object.values(prodPreset);
    const ownProfiles =
      kitType === "app" || Array.isArray(requirements)
        ? prodProfiles
        : [
            ...prodProfiles,
            ...Object.values(filterPreset(preset, requirements.development)),
          ];
    const reasons: [string, Capability[]][] = [];
    const collect = (
      module: string,
      capabilities: Capability[],
      profiles: Profile[]
    ) => {
      const found = sanitizeCapabilities(capabilities).filter((capability) =>
        profiles.some((profile) => matches(capability, profile))
      );
      if (found.length > 0) {
        reasons.push([module, [...new Set(found)]]);
      }
    };

    collect(manifest.name, capabilities, ownProfiles);
    if (kitType === "app") {
      visitDependencies(
        manifest,
        projectRoot,
        (module, modulePath, manifest) => {
          const config = getKitConfigFromPackageManifest(manifest, modulePath);
          if (!config || !getRequirements(config)) {
            return;
          }

          const capabilities =
            config.alignDeps?.capabilities || config.capabilities;
          if (Array.isArray(capabilities)) {
            collect(
              module,
              capabilities.filter(
                (c) =>
                  !isCoreCapability(c) && !isDevOnlyCapability(c, prodProfiles)
              ),
              prodProfiles
            );
          }
        }
      );
    }

    for (const [index, [module, capabilities]] of reasons.entries()) {
      const last = index === reasons.length - 1;
      console.log(`${last ? "└" : "├"}─ ${module}`);
      console.log(
        `${last ? " " : "│"}  └─ ${name} (via ${capabilities.map((c) => `'${c}'`).join(", ")})`
      );
      if (!last) {
        console.log("│");
      }
    }
    return "success";
  };
}
