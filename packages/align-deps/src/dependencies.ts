import { getKitConfigFromPackageManifest } from "@rnx-kit/config";
import { error, warn } from "@rnx-kit/console";
import { readPackage } from "@rnx-kit/tools-node/package";
import type { Capability } from "@rnx-kit/types-kit-config";
import type { PackageManifest } from "@rnx-kit/types-node";
import * as path from "node:path";
import { ResolverFactory } from "oxc-resolver";
import { BoundedCache } from "./cache.ts";
import { filterPreset } from "./preset.ts";
import type { Options, Preset, Profile } from "./types.ts";

type Trace = {
  module: string;
  requirements: string[];
  profiles: string[];
};

const manifestCache = new BoundedCache<string, PackageManifest>();
const resolver = new ResolverFactory({ exportsFields: [] });

function isCoreCapability(capability: Capability): boolean {
  return capability.startsWith("core-");
}

function isDevOnlyCapability(
  capability: Capability,
  profiles: Partial<Profile>[]
): boolean {
  return profiles.some((profile) => profile[capability]?.devOnly);
}

function readManifestFromDir(packageDir: string): PackageManifest {
  const cached = manifestCache.get(packageDir);
  if (cached) {
    return cached;
  }

  const manifest = readPackage(packageDir);
  manifestCache.set(packageDir, manifest);
  return manifest;
}

export function visitDependencies(
  { dependencies }: PackageManifest,
  projectRoot: string,
  visitor: (
    module: string,
    modulePath: string,
    manifest: PackageManifest
  ) => void,
  visited: Set<string> = new Set<string>()
): void {
  if (!dependencies) {
    return;
  }

  for (const dependency of Object.keys(dependencies)) {
    if (visited.has(dependency)) {
      continue;
    }

    visited.add(dependency);

    const result = resolver.sync(projectRoot, dependency + "/package.json");
    if (!result.path) {
      warn(`Unable to resolve module '${dependency}' from '${projectRoot}'`);
      continue;
    }

    const packageDir = path.dirname(result.path);
    const manifest = readManifestFromDir(packageDir);
    visitor(dependency, packageDir, manifest);
    visitDependencies(manifest, packageDir, visitor, visited);
  }
}

/**
 * Gathers requirements from dependencies, and their dependencies.
 * @param projectRoot Root of the package to check
 * @param manifest Package manifest
 * @param preset Preset satisfying the requirements of the current package
 * @param requirements Requirements of the current package
 * @param appCapabilities Capabilities used by the current package
 * @param options Command line options
 * @returns Capabilities required by dependencies
 */
export function gatherRequirements(
  projectRoot: string,
  manifest: PackageManifest,
  preset: Preset,
  requirements: string[],
  appCapabilities: Capability[],
  { loose }: Pick<Options, "loose">
): { preset: Preset; capabilities: Capability[] } {
  const allCapabilities = new Set<Capability>();
  const trace: Trace[] = [
    {
      module: manifest.name,
      profiles: Object.keys(preset),
      requirements,
    },
  ];

  const root = path.resolve(projectRoot);
  visitDependencies(manifest, root, (module, modulePath, manifest) => {
    const kitConfig = getKitConfigFromPackageManifest(manifest, modulePath);
    if (!kitConfig) {
      return;
    }

    const requirements = (() => {
      const requirements = kitConfig.alignDeps?.requirements;
      if (requirements) {
        return Array.isArray(requirements)
          ? requirements
          : requirements.production;
      }

      if (kitConfig.reactNativeVersion) {
        return [`react-native@${kitConfig.reactNativeVersion}`];
      }

      return null;
    })();
    if (!requirements) {
      return;
    }

    const capabilities =
      kitConfig.alignDeps?.capabilities || kitConfig.capabilities;
    if (Array.isArray(capabilities)) {
      for (const capability of capabilities) {
        allCapabilities.add(capability);
      }
    }

    const filteredPreset = filterPreset(preset, requirements);
    const filteredNames = Object.keys(filteredPreset);
    if (filteredNames.length !== trace[trace.length - 1].profiles.length) {
      trace.push({
        module,
        profiles: filteredNames,
        requirements,
      });
    }

    // In strict mode, we want to continue so we can catch all dependencies
    // that cannot be satisfied. Whereas in loose mode, we can ignore them and
    // carry on with the profiles that satisfy the rest.
    if (filteredNames.length > 0) {
      preset = filteredPreset;
    }
  });

  if (trace[trace.length - 1].profiles.length === 0) {
    const message = "No profiles could satisfy all requirements";
    const fullTrace = [
      message,
      ...trace.map(({ module, profiles, requirements }) => {
        const names = profiles.join(", ");
        const reqs = requirements?.join(", ");
        return `\t[${names}] satisfies '${module}' because it requires ${reqs}`;
      }),
    ].join("\n");
    if (loose) {
      warn(fullTrace);
    } else {
      error(fullTrace);
      throw new Error(message);
    }
  }

  const profiles = Object.values(preset);
  for (const capability of allCapabilities) {
    /**
     * Core capabilities are capabilities that must always be declared by the
     * hosting app and should not be included when gathering requirements.
     * This is to avoid forcing an app to install dependencies it does not
     * need, e.g. `react-native-windows` when the app only supports iOS.
     */
    if (
      isCoreCapability(capability) ||
      isDevOnlyCapability(capability, profiles)
    ) {
      allCapabilities.delete(capability);
    }
  }

  // Merge with app capabilities _after_ filtering out core and dev-only
  // capabilities.
  for (const capability of appCapabilities) {
    allCapabilities.add(capability);
  }

  return { preset, capabilities: Array.from(allCapabilities) };
}
