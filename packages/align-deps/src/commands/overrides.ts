import { readPackage } from "@rnx-kit/tools-node/package";
import type { PackageManifest } from "@rnx-kit/types-node";
import * as nodefs from "node:fs";
import * as path from "node:path";
import semverValidRange from "semver/ranges/valid.js";
import { isMetaPackage } from "../capabilities.ts";
import { transformConfig } from "../compatibility/config.ts";
import { defaultConfig, loadConfig } from "../config.ts";
import { isSubset } from "../diff.ts";
import { isError } from "../errors.ts";
import { isEmptyArray } from "../helpers.ts";
import { filterPreset, mergePresets } from "../preset.ts";
import { makeDefaultReporter } from "../reporter.ts";
import type { Reporter } from "../reporter.ts";
import type { CommandFinalizer, Options, Preset } from "../types.ts";

/**
 * Managed dependencies, i.e. dependencies that are provided by capabilities,
 * and the version ranges that they are allowed to be within.
 */
export type ManagedDependencies = Map<string, string[]>;

export type OverrideEntry = {
  section: string;
  key: string;
  name: string;
  version: string;
};

/**
 * Sections that package managers use to pin dependencies.
 *
 * @note We currently only support entries that resolve to a plain version
 * range. Entries using protocols such as `patch:` or `workspace:`, or npm's `$`
 * references, are skipped as we cannot tell what version they resolve to
 * without involving the package manager.
 *
 * @todo pnpm declares its overrides `pnpm-workspace.yaml`:
 *       https://pnpm.io/settings/dependency-resolution#overrides
 *
 * @see {@link versionRangeOf}
 */
const OVERRIDE_SECTIONS = ["overrides", "resolutions"] as const;

const NPM_PROTOCOL = "npm:";

/**
 * Returns the name of the package that an override key refers to.
 *
 * Keys can be scoped to a dependency path, e.g. `parent/react`, in which case
 * only the last segment is the package being overridden. The segment may also
 * carry a version descriptor, e.g. `react@18.2.0`, which is not part of the
 * name.
 *
 * @param key The override key to extract the package name from
 * @returns The package name if the key has one; otherwise `undefined`
 */
export function packageNameOf(key: string): string | undefined {
  const nameStart = key.lastIndexOf("/") + 1;

  // A version descriptor cannot be empty, and cannot start the name
  const versionStart = key.indexOf("@", nameStart + 1);
  if (versionStart === key.length - 1) {
    return undefined;
  }

  const name =
    versionStart < 0
      ? key.substring(nameStart)
      : key.substring(nameStart, versionStart);
  if (!name || name.startsWith("@")) {
    return undefined;
  }

  // The preceding segment is part of the name only if it is a scope
  const scopeStart = key.lastIndexOf("/", nameStart - 2) + 1;
  const scope = key.substring(scopeStart, nameStart - 1);
  const isScope =
    scope.length > 1 && scope.startsWith("@") && !scope.includes("@", 1);
  return isScope ? `${scope}/${name}` : name;
}

function getOrInsert(managed: ManagedDependencies, key: string): string[] {
  const value = managed.get(key);
  if (value) {
    return value;
  }

  const val: string[] = [];
  managed.set(key, val);
  return val;
}

function visitOverrides(
  section: string,
  node: unknown,
  entries: OverrideEntry[],
  parent?: string
): void {
  if (!node || typeof node !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    // npm allows nested overrides, where `.` refers to the parent package
    const name = key === "." ? parent : packageNameOf(key);
    if (typeof value === "string") {
      if (name) {
        entries.push({ section, key, name, version: value });
      }
    } else {
      visitOverrides(section, value, entries, name);
    }
  }
}

/**
 * Returns all resolutions/overrides declared in the specified manifest.
 * @param manifest The package manifest to scan for overrides
 * @returns A list of overridden packages
 */
export function findOverrides(manifest: PackageManifest): OverrideEntry[] {
  const entries: OverrideEntry[] = [];

  for (const section of OVERRIDE_SECTIONS) {
    visitOverrides(section, manifest[section], entries);
  }

  return entries;
}

/**
 * Returns the dependencies managed by the specified preset.
 * @param preset The preset to gather managed dependencies from
 * @returns The managed dependencies
 */
export function collectManagedDependencies(
  preset: Preset
): ManagedDependencies {
  const managed: ManagedDependencies = new Map();

  for (const profile of Object.values(preset)) {
    for (const pkg of Object.values(profile)) {
      if (isMetaPackage(pkg)) {
        continue;
      }

      const versions = getOrInsert(managed, pkg.name);
      if (!versions.includes(pkg.version)) {
        versions.push(pkg.version);
      }
    }
  }

  return managed;
}

/**
 * Returns the version range that the specified override resolves to.
 *
 * `npm:` is the default protocol, meaning that `npm:^0.70.0` is equivalent to
 * `^0.70.0`. It can also be used to alias another package, e.g.
 * `npm:preact@^10.0.0`. Only aliases that point back at the same package can be
 * compared. The rest are treated as unknown, as are other protocols such as
 * `patch:` and `workspace:`, and npm's `$` references.
 *
 * @param name The name of the package being overridden
 * @param version The version descriptor of the override
 * @returns The version range if it can be determined; `undefined` otherwise
 */
export function versionRangeOf(
  name: string,
  version: string
): string | undefined {
  if (semverValidRange(version)) {
    return version;
  }

  if (!version.startsWith(NPM_PROTOCOL)) {
    return undefined;
  }

  // `"react": "npm:^19.0.0"`
  const descriptor = version.substring(NPM_PROTOCOL.length);
  if (semverValidRange(descriptor)) {
    return descriptor;
  }

  // `"react": "npm:react@^19.0.0"`
  const index = descriptor.lastIndexOf("@");
  if (index <= 0 || descriptor.substring(0, index) !== name) {
    return undefined;
  }

  const range = descriptor.substring(index + 1);
  return semverValidRange(range) ? range : undefined;
}

/**
 * Checks that resolutions/overrides declared in the specified manifest do not
 * pin managed dependencies to versions that are outside the current profiles.
 *
 * Overrides are commonly used to pin a dependency to a specific version. An
 * entry is therefore considered fine as long as it stays within the expected
 * range, even in strict diff mode.
 *
 * @note This check is advisory only. It never modifies the manifest, and only
 * emits warnings.
 *
 * @param overrides Overrides declared in the package manifest
 * @param manifestPath The path to the package manifest
 * @param managed The dependencies that are currently managed
 * @param reporter Function for outputting warnings
 */
export function checkOverrides(
  overrides: OverrideEntry[],
  manifestPath: string,
  managed: ManagedDependencies,
  reporter: Reporter
): void {
  for (const { section, key, name, version } of overrides) {
    const versions = managed.get(name);
    if (isEmptyArray(versions)) {
      continue;
    }

    // Skip entries that we cannot compare, e.g. `patch:`/`workspace:` protocols
    const pinned = versionRangeOf(name, version);
    if (!pinned) {
      continue;
    }

    const range = versions.join(" || ");
    if (isSubset(pinned, range, { includePrerelease: true })) {
      continue;
    }

    reporter.warn(
      `${manifestPath}: ${section}["${key}"]: "${version}" pins '${name}' outside the expected version range: ${range}`
    );
  }
}

function resolveScope(
  manifest: PackageManifest,
  manifestPath: string,
  options: Options,
  /** @internal */ fs = nodefs
): Pick<Options, "presets" | "requirements"> {
  const inputConfig = loadConfig({ path: manifestPath, manifest }, options, fs);
  if (isError(inputConfig)) {
    return options;
  }

  const {
    alignDeps: { presets, requirements },
  } = "alignDeps" in inputConfig ? inputConfig : transformConfig(inputConfig);
  return {
    presets: presets || defaultConfig.presets,
    requirements: Array.isArray(requirements)
      ? requirements
      : // We always prefer development requirements because you are only in the
        // repository if you're working on something.
        requirements.development || requirements.production,
  };
}

/**
 * Creates a check that verifies the resolutions/overrides declared in the
 * workspace root, or in the current package if it is the only one.
 *
 * Unlike the other checks, this one runs once rather than once per package.
 * Resolutions/overrides can only be declared in the root `package.json`, and
 * the versions they are compared against are dictated by `requirements` — not
 * by anything the individual packages declare.
 *
 * Requirements are what scopes this check. Without them, we would have to fall
 * back to the union of every checked package's profiles. Because libraries
 * commonly support a wide range of versions, e.g. `react-native@>=0.62 <1.0`,
 * that union quickly grows wide enough for any pin to be considered fine —
 * making the check useless. We therefore require that requirements are set.
 *
 * @param options Command line options
 * @returns The check if it is enabled and can be scoped; otherwise `undefined`
 */
export function makeOverridesChecker(
  options: Options,
  /** @internal */ fs = nodefs
): CommandFinalizer | undefined {
  if (!options.checkOverrides) {
    return undefined;
  }

  return (manifestPath, reporter = makeDefaultReporter(manifestPath)) => {
    const manifest = readPackage(manifestPath, fs);
    const overrides = findOverrides(manifest);
    if (overrides.length === 0) {
      return;
    }

    const scope = resolveScope(manifest, manifestPath, options, fs);
    if (!scope.requirements) {
      reporter.warn(
        "`--check-overrides` needs `--requirements`, or an rnx-kit " +
          "configuration in the package declaring requirements, to determine " +
          "which versions they are expected to be within; skipping the check"
      );
      return;
    }

    const { presets, requirements } = scope;
    const projectRoot = path.dirname(manifestPath);
    const preset = filterPreset(
      mergePresets(presets, projectRoot),
      requirements
    );

    const managed = collectManagedDependencies(preset);
    if (managed.size === 0) {
      return;
    }

    checkOverrides(overrides, manifestPath, managed, reporter);
  };
}
