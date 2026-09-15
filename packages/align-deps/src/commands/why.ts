import type { Capability } from "@rnx-kit/types-kit-config";
import * as path from "node:path";
import { isMetaPackage, visitCapability } from "../capabilities.ts";
import { transformConfig } from "../compatibility/config.ts";
import { loadConfig, sanitizeCapabilities } from "../config.ts";
import { isError } from "../errors.ts";
import { resolve } from "../preset.ts";
import type { Command, Options, Profile } from "../types.ts";

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
    const { capabilities } = alignDeps;
    const dependencies: [string, Capability[]][] = [];
    const { devPreset, prodPreset } = resolve(
      config,
      projectRoot,
      options,
      (module, capabilities) => dependencies.push([module, capabilities]),
      name
    );
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
          visitCapability(
            capability,
            profile,
            (pkg, _capability, visitChildren) =>
              Boolean(
                pkg &&
                !isMetaPackage(pkg) &&
                pkg.name === name &&
                (includeDevOnly || !pkg.devOnly)
              ) || visitChildren()
          )
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
    collect(manifest.name, capabilities, Object.values(devPreset), true);
    for (const [module, capabilities] of dependencies) {
      collect(module, capabilities, prodProfiles, true);
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
