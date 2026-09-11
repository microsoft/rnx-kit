import { info, warn } from "@rnx-kit/console";
import type { Capability } from "@rnx-kit/types-kit-config";
import * as path from "node:path";
import { resolveCapabilitiesUnchecked } from "../capabilities.ts";
import { transformConfig } from "../compatibility/config.ts";
import { loadConfig } from "../config.ts";
import { isError } from "../errors.ts";
import { resolve } from "../preset.ts";
import type { Command, ErrorCode, Options, Package, Preset } from "../types.ts";

type Reason = {
  name: string;
  manifestPath: string;
  capabilities: Capability[];
};

type Explanation = {
  manifestPath: string;
  dependency: string;
  reasons: Reason[];
};

function matchingCapabilities(
  manifestPath: string,
  dependency: string,
  capabilities: Capability[],
  presets: [preset: Preset, includeDevOnly: boolean][]
): Capability[] {
  const matches = new Set<Capability>();
  const unresolved = new Map<string, Set<string>>();
  for (const [preset, includeDevOnly] of presets) {
    const profileMatches = new Set<Capability>();
    let firstMatch: Package | undefined;
    const { unresolvedCapabilities } = resolveCapabilitiesUnchecked(
      capabilities,
      preset,
      (pkg, declared) => {
        if (pkg.name === dependency) {
          firstMatch ??= pkg;
          profileMatches.add(declared);
        }
      }
    );
    for (const [capability, profiles] of Object.entries(
      unresolvedCapabilities
    )) {
      const missing = unresolved.get(capability) ?? new Set<string>();
      for (const profile of profiles) {
        missing.add(profile);
      }
      unresolved.set(capability, missing);
    }
    // Peer dependencies use the first resolved package's devOnly flag.
    if (includeDevOnly || !firstMatch?.devOnly) {
      for (const capability of profileMatches) {
        matches.add(capability);
      }
    }
  }
  if (unresolved.size > 0) {
    warn(
      `${manifestPath}: The following capabilities could not be resolved for one or more profiles:` +
        Array.from(
          unresolved,
          ([capability, profiles]) =>
            `\n\t${capability} (missing in ${Array.from(profiles).join(", ")})`
        ).join("")
    );
  }
  return Array.from(matches).sort();
}

export function collectWhy(
  manifestPath: string,
  dependency: string,
  options: Options
): Explanation | ErrorCode {
  manifestPath = path.resolve(manifestPath);
  const input = loadConfig(manifestPath, options);
  if (isError(input)) {
    return input;
  }
  const config = "alignDeps" in input ? input : transformConfig(input);
  const projectRoot = path.dirname(manifestPath);
  const sources: Reason[] = [];
  const { prodPreset, devPreset } = resolve(
    config,
    projectRoot,
    options,
    (name, directory, capabilities) => {
      sources.push({
        name,
        manifestPath: path.join(directory, "package.json"),
        capabilities,
      });
    }
  );
  if (config.kitType === "app" && Object.keys(prodPreset).length !== 1) {
    return "invalid-app-requirements";
  }
  const presets: [Preset, boolean][] =
    config.kitType === "app"
      ? [[prodPreset, true]]
      : [
          [prodPreset, false],
          [devPreset, true],
        ];
  const reasons = new Map<string, Reason>();
  const addReason = (
    name: string,
    manifestPath: string,
    capabilities: Capability[]
  ) => {
    const matches = matchingCapabilities(
      manifestPath,
      dependency,
      capabilities,
      presets
    );
    if (matches.length > 0) {
      const previous = reasons.get(manifestPath);
      reasons.set(manifestPath, {
        name: previous?.name ?? name,
        manifestPath,
        capabilities: Array.from(
          new Set([...(previous?.capabilities ?? []), ...matches])
        ).sort(),
      });
    }
  };
  addReason(config.manifest.name, manifestPath, config.alignDeps.capabilities);
  for (const { name, manifestPath, capabilities } of sources) {
    addReason(name, manifestPath, capabilities);
  }
  const sortedReasons = Array.from(reasons.values()).sort((a, b) =>
    a.name < b.name
      ? -1
      : a.name > b.name
        ? 1
        : a.manifestPath.localeCompare(b.manifestPath)
  );
  return { manifestPath, dependency, reasons: sortedReasons };
}

export function renderWhy({
  manifestPath,
  dependency,
  reasons,
}: Explanation): string {
  if (reasons.length === 0) {
    return `${manifestPath}: No packages require '${dependency}' through capabilities.`;
  }
  return [
    `${manifestPath}: Packages requiring '${dependency}' through capabilities:`,
    ...reasons.map(({ name, manifestPath, capabilities }, index) => {
      const last = index === reasons.length - 1;
      const branch = last ? "└─" : "├─";
      const prefix = last ? "   " : "│  ";
      return (
        `${branch} ${name} (${manifestPath})\n` +
        capabilities
          .map((capability, index) => {
            const branch = index === capabilities.length - 1 ? "└─" : "├─";
            return `${prefix}${branch} ${dependency} (via '${capability}')`;
          })
          .join("\n")
      );
    }),
  ].join("\n");
}

export function makeWhyCommand(dependency: string, options: Options): Command {
  return (manifestPath) => {
    const explanation = collectWhy(manifestPath, dependency, options);
    if (typeof explanation === "string") {
      return explanation;
    }
    info(renderWhy(explanation));
    return "success";
  };
}
