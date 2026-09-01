import { readPackage } from "@rnx-kit/tools-node/package";
import type { PackageManifest, PackageOverrides } from "@rnx-kit/types-node";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { resolveCapabilitiesUnchecked } from "../capabilities.ts";
import { migrateConfig } from "../compatibility/config.ts";
import { loadConfig } from "../config.ts";
import { isSubset } from "../diff.ts";
import { isError } from "../errors.ts";
import { resolve } from "../preset.ts";
import { makeGroupedReporter, type Reporter } from "../reporter.ts";
import type { AlignDepsOptions, Options, Preset } from "../types.ts";

/**
 * A version pin declared in a `resolutions`/`overrides` entry.
 */
type Override = {
  /** Which field the pin was declared in. */
  field: "resolutions" | "overrides";
  /** The managed package the pin targets. */
  name: string;
  /** The version the package is pinned to. */
  version: string;
};

/**
 * An override pinning a managed dependency outside the active profile.
 */
type OverrideViolation = Override & {
  /** The version range(s) the active profile expects. */
  expected: string;
};

/**
 * The set of managed packages resolved across the workspace, mapped to the
 * version range(s) that the active profile allows.
 */
type ManagedPackages = Map<string, string[]>;

/**
 * A package manifest together with the path it was read from.
 */
type LoadedManifest = { path: string; manifest: PackageManifest };

/**
 * Extracts the package name from a package descriptor, dropping any version
 * range suffix.
 *
 * Examples:
 * - `lodash` -> `lodash`
 * - `lodash@^1.0.0` -> `lodash`
 * - `@babel/core` -> `@babel/core`
 * - `@babel/core@^7.0.0` -> `@babel/core`
 */
function packageNameFromDescriptor(descriptor: string): string {
  // For scoped packages, the first `@` is part of the name; the range (if any)
  // is separated by a later `@`.
  const at = descriptor.startsWith("@")
    ? descriptor.indexOf("@", 1)
    : descriptor.indexOf("@");
  return at > 0 ? descriptor.substring(0, at) : descriptor;
}

/**
 * Extracts the target package name from a Yarn `resolutions` key.
 *
 * Yarn keys may include a path of ancestor descriptors, e.g. `parent/lodash` or
 * `parent/**​/@scope/pkg`. The pinned package is the last descriptor in the
 * path.
 */
function packageNameFromResolutionKey(key: string): string {
  const segments = key.split("/");
  const last = segments[segments.length - 1];
  const prev = segments[segments.length - 2];

  // A scope segment is exactly `@scope` (starts with `@`, no version). When the
  // second-to-last segment is a scope, the last descriptor is scoped.
  if (prev?.startsWith("@") && !prev.includes("@", 1)) {
    return packageNameFromDescriptor(`${prev}/${last}`);
  }

  return packageNameFromDescriptor(last);
}

/**
 * Collects all version pins declared in the manifest's `resolutions` (Yarn) and
 * `overrides` (npm) fields.
 *
 * @remarks Values that reference another dependency (npm's `$name` syntax) are
 * ignored as they do not pin a concrete version.
 */
export function collectOverrides(manifest: PackageManifest): Override[] {
  const overrides: Override[] = [];

  const { resolutions } = manifest;
  if (resolutions) {
    for (const [key, version] of Object.entries(resolutions)) {
      if (typeof version === "string" && !version.startsWith("$")) {
        overrides.push({
          field: "resolutions",
          name: packageNameFromResolutionKey(key),
          version,
        });
      }
    }
  }

  if (manifest.overrides) {
    collectNpmOverrides(manifest.overrides, overrides);
  }

  return overrides;
}

/**
 * Recursively collects version pins from an npm `overrides` object.
 *
 * npm allows nested overrides where a value is an object of child overrides.
 * The special `"."` key pins the parent package itself.
 */
function collectNpmOverrides(
  overrides: PackageOverrides,
  result: Override[]
): void {
  for (const [key, value] of Object.entries(overrides)) {
    const name = packageNameFromDescriptor(key);
    if (typeof value === "string") {
      if (!value.startsWith("$")) {
        result.push({ field: "overrides", name, version: value });
      }
    } else if (value && typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value)) {
        if (childKey === ".") {
          if (typeof childValue === "string" && !childValue.startsWith("$")) {
            result.push({ field: "overrides", name, version: childValue });
          }
        } else {
          collectNpmOverrides({ [childKey]: childValue }, result);
        }
      }
    }
  }
}

/**
 * Adds the resolved capabilities of a preset to the set of managed packages.
 */
function addManagedPackages(
  managed: ManagedPackages,
  config: AlignDepsOptions,
  preset: Preset
): void {
  const { dependencies } = resolveCapabilitiesUnchecked(
    config.alignDeps.capabilities,
    preset
  );
  for (const [name, packages] of Object.entries(dependencies)) {
    const versions = managed.get(name) ?? [];
    for (const pkg of packages) {
      if (!versions.includes(pkg.version)) {
        versions.push(pkg.version);
      }
    }
    managed.set(name, versions);
  }
}

/**
 * Resolves the set of managed packages across all configured packages in the
 * workspace.
 *
 * Both the production and development profiles are considered so that a pin
 * matching either is left alone. Packages without a valid align-deps
 * configuration contribute nothing.
 *
 * @param manifests The already-parsed package manifests to inspect
 * @param options Command line options
 * @returns A map of managed package name to the version range(s) it may take
 */
export function collectManagedPackages(
  manifests: LoadedManifest[],
  options: Options
): ManagedPackages {
  const managed: ManagedPackages = new Map();

  for (const { path: manifestPath, manifest } of manifests) {
    try {
      const inputConfig = loadConfig({ path: manifestPath, manifest }, options);
      if (isError(inputConfig)) {
        continue;
      }

      // Avoid `migrateConfig`'s side effects (warnings/writes) for legacy
      // configs by only migrating when it is a no-op transformation.
      const config = migrateConfig(inputConfig, manifestPath, {
        ...options,
        migrateConfig: false,
      });

      const { devPreset, prodPreset } = resolve(
        config,
        path.dirname(manifestPath),
        options
      );
      addManagedPackages(managed, config, prodPreset);
      addManagedPackages(managed, config, devPreset);
    } catch (_) {
      // A package may be unresolvable (e.g. no profile satisfies its
      // requirements). Skip it; the override check is best-effort.
      continue;
    }
  }

  return managed;
}

/**
 * Finds `resolutions`/`overrides` entries that pin a managed dependency to a
 * version outside the active profile.
 *
 * Overrides are frequently used to deliberately pin a concrete version, so an
 * entry is considered fine as long as it stays within the managed range (subset
 * semantics), regardless of the configured diff mode. Only pins that fall
 * outside, or are broader than, the managed range are flagged. Entries that do
 * not map to a managed package are ignored.
 *
 * @param managed The managed packages resolved across the workspace
 * @param manifest The package manifest to inspect
 * @returns A list of overrides that drift from the active profile
 */
export function findOverrideViolations(
  managed: ManagedPackages,
  manifest: PackageManifest
): OverrideViolation[] {
  const violations: OverrideViolation[] = [];

  for (const override of collectOverrides(manifest)) {
    const versions = managed.get(override.name);
    if (!versions || versions.length === 0) {
      continue;
    }

    const expected = versions.join(" || ");
    if (!isSubset(override.version, expected, { includePrerelease: true })) {
      violations.push({ ...override, expected });
    }
  }

  return violations;
}

/**
 * Formats a list of override violations for output.
 */
function stringifyViolations(
  manifestPath: string,
  violations: OverrideViolation[]
): string {
  const lines = [
    `${manifestPath}: Found override(s) pinning managed dependencies outside the active profile:`,
  ];
  for (let index = 0; index < violations.length; index++) {
    const { field, name, version, expected } = violations[index];
    const prefix = index === violations.length - 1 ? "└──" : "├──";
    lines.push(
      `      ${prefix} ${field}["${name}"]: pinned to "${version}", expected "${expected}"`
    );
  }
  return lines.join("\n");
}

/**
 * Checks the specified package manifests for `resolutions`/`overrides` entries
 * that pin a managed dependency outside the active profile.
 *
 * This check is read-only and non-fatal: it only emits warnings and never
 * modifies overrides or affects the process exit code, even with `--write`.
 *
 * In a monorepo, `resolutions`/`overrides` are typically only declared in the
 * workspace-root `package.json`, which often has no align-deps config of its
 * own. Managed packages are therefore resolved across _all_ configured packages
 * in the workspace, and every manifest's overrides are validated against them.
 * Outside a monorepo, the single package being checked acts as the root.
 *
 * @param manifests Paths to the package manifests to inspect
 * @param options Command line options
 */
export function checkOverrides(
  manifests: string[],
  options: Options,
  /** @internal */ fs = nodefs,
  /** @internal */ makeReporter: (
    title: string
  ) => Reporter = makeGroupedReporter
): void {
  // Read each manifest exactly once and reuse the parsed result for both
  // managed-package resolution and override checking.
  const loaded: LoadedManifest[] = [];
  for (const manifestPath of manifests) {
    try {
      loaded.push({
        path: manifestPath,
        manifest: readPackage(manifestPath, fs),
      });
    } catch (_) {
      continue;
    }
  }

  const managed = collectManagedPackages(loaded, options);
  if (managed.size === 0) {
    return;
  }

  for (const { path: manifestPath, manifest } of loaded) {
    const violations = findOverrideViolations(managed, manifest);
    if (violations.length > 0) {
      const reporter = makeReporter(manifestPath);
      reporter.warn(stringifyViolations(manifestPath, violations));
      reporter.close();
    }
  }
}
