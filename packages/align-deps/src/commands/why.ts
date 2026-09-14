import type { Capability } from "@rnx-kit/types-kit-config";
import * as path from "node:path";
import { isMetaPackage } from "../capabilities.ts";
import { transformConfig } from "../compatibility/config.ts";
import { loadConfig, sanitizeCapabilities } from "../config.ts";
import {
  gatherRequirements,
  isCoreCapability,
  isDevOnlyCapability,
} from "../dependencies.ts";
import { isError } from "../errors.ts";
import { filterPreset, mergePresets } from "../preset.ts";
import type { Command, Options, Profile } from "../types.ts";

function requiresPackage(
  capability: Capability,
  profile: Profile,
  name: string,
  includeDevOnly: boolean,
  visited = new Set<string>(["__proto__", "constructor", "prototype"])
): boolean {
  if (visited.has(capability)) {
    return false;
  }
  visited.add(capability);

  const pkg = profile[capability];
  return Boolean(
    pkg &&
    ((!isMetaPackage(pkg) &&
      pkg.name === name &&
      (includeDevOnly || !pkg.devOnly)) ||
      pkg.capabilities?.some((child) =>
        requiresPackage(child, profile, name, includeDevOnly, visited)
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
    const preset = mergePresets(alignDeps.presets, projectRoot);
    const { requirements, capabilities } = alignDeps;
    const prodRequirements = Array.isArray(requirements)
      ? requirements
      : requirements.production;
    let prodPreset = filterPreset(preset, prodRequirements);
    const devProfiles =
      kitType === "app"
        ? []
        : Object.values(
            Array.isArray(requirements)
              ? prodPreset
              : filterPreset(preset, requirements.development)
          );
    if (
      ![...Object.values(prodPreset), ...devProfiles].some((profile) =>
        Object.values(profile).some(
          (pkg) => !isMetaPackage(pkg) && pkg.name === name
        )
      )
    ) {
      return "success";
    }

    const dependencies: [string, Capability[]][] = [];
    if (kitType === "app") {
      prodPreset = gatherRequirements(
        projectRoot,
        manifest,
        prodPreset,
        prodRequirements,
        capabilities,
        options,
        (module, capabilities) => dependencies.push([module, capabilities])
      ).preset;
    }
    const prodProfiles = Object.values(prodPreset);
    const reasons = new Map<string, Set<Capability>>();
    const collect = (
      module: string,
      capabilities: Capability[],
      profiles: Profile[],
      includeDevOnly: boolean
    ) => {
      const found = sanitizeCapabilities(capabilities).filter((capability) =>
        profiles.some((profile) =>
          requiresPackage(capability, profile, name, includeDevOnly)
        )
      );
      if (found.length > 0) {
        reasons.set(
          module,
          new Set([...(reasons.get(module) ?? []), ...found])
        );
      }
    };

    collect(manifest.name, capabilities, prodProfiles, kitType === "app");
    collect(manifest.name, capabilities, devProfiles, true);
    for (const [module, capabilities] of dependencies) {
      collect(
        module,
        capabilities.filter(
          (c) => !isCoreCapability(c) && !isDevOnlyCapability(c, prodProfiles)
        ),
        prodProfiles,
        true
      );
    }

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
