import type { PackageManifest } from "@rnx-kit/types-node";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { findUp } from "./path.ts";

/**
 * Components of a package reference.
 */
export type PackageRef = {
  scope?: string;
  name: string;
};

/**
 * Module reference with the package name and optional sub-module path included as path
 */
export type DestructuredModuleRef = PackageRef & {
  path?: string;
};

function getModuleRefParts(
  ref: string,
  found: string[] = [],
  requested = 2,
  startPos = 0
): string[] {
  if (startPos < ref.length) {
    if (requested > 1) {
      const splitAt = ref.indexOf("/", startPos);
      if (splitAt >= 0) {
        requested += startPos === 0 && ref[0] === "@" ? 1 : 0;
        found.push(ref.slice(startPos, splitAt));
        return getModuleRefParts(ref, found, requested - 1, splitAt + 1);
      }
    }
    found.push(ref.slice(startPos));
  }
  return found;
}

/**
 * Destructure a module reference into its component par
 * @param r module reference to destructure
 * @returns either a destructured module reference or undefined if it is a file reference
 */
export function destructureModuleRef(r: string): DestructuredModuleRef {
  if (r) {
    const parts = getModuleRefParts(r);
    if (parts.length > 0) {
      // if we only have one term the first term will be treated as the name, even if it is a scope
      if (parts.length === 1) {
        return { name: parts[0] };
      }

      // otherwise split the parts and return them
      const scope = parts[0].startsWith("@") ? parts.shift() : undefined;
      const name = parts.shift();
      const path = parts.shift();
      if (name) {
        return { name, scope, path };
      }
    }
  }

  throw new Error(`Invalid package reference: "${r}"`);
}

/**
 * Simple helper to merge two parts of a package reference, one of which may be undefined.
 * @param parts parts of a package reference to merge together, in order
 * @returns Merged package reference, empty string if no parts are defined
 */
export function mergeModulePaths(...parts: (string | undefined)[]): string {
  return parts.filter((part) => !!part).join("/");
}

/**
 * Parse a package reference string. An example reference is the `name`
 * property found in `package.json`.
 *
 * @param r Package reference string
 * @returns Parsed package reference object
 */
export function parsePackageRef(r: string): PackageRef {
  const { scope, name, path } = destructureModuleRef(r);
  const fullName = mergeModulePaths(name, path);
  return { name: fullName, scope };
}

/**
 * Resolve a package path to a file reference by appending `package.json`, if needed.
 *
 * @param pkgPath Package path. May contain `package.json`.
 * @returns File reference to `package.json`
 */
function resolvePackagePath(pkgPath: string): string {
  if (path.basename(pkgPath).toLowerCase() !== "package.json") {
    return path.join(pkgPath, "package.json");
  }
  return pkgPath;
}

/**
 * Read a `package.json` manifest from a file.
 *
 * @param pkgPath Either a path directly to the target `package.json` file, or the directory containing it.
 * @returns Package manifest
 */
export function readPackage(
  pkgPath: string,
  /** @internal */ fs = nodefs
): PackageManifest {
  const pkgFile = resolvePackagePath(pkgPath);
  return JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
}

/**
 * Write a `package.json` manifest to a file.
 *
 * @param pkgPath Either a path directly to the target `package.json` file, or the directory containing it.
 * @param manifest Package manifest
 * @param space Indentation to apply to the output
 */
export function writePackage(
  pkgPath: string,
  manifest: PackageManifest,
  space = "  ",
  /** @internal */ fs = nodefs
): void {
  const pkgFile = resolvePackagePath(pkgPath);
  fs.writeFileSync(
    pkgFile,
    JSON.stringify(manifest, undefined, space) + "\n",
    "utf-8"
  );
}

/**
 * Find the nearest `package.json` manifest file. Search upward through all
 * parent directories.
 *
 * If a starting directory is given, use it. Otherwise, use the current working
 * directory.
 *
 * @param startDir Optional starting directory for the search. If not given, the current directory is used.
 * @returns Path to `package.json`, or `undefined` if not found.
 */
export function findPackage(
  startDir?: string,
  /** @internal */ fs = nodefs
): string | undefined {
  return findUp("package.json", { startDir }, fs);
}

/**
 * Find the parent directory of the nearest `package.json` manifest file. Search
 * upward through all parent directories.
 *
 * If a starting directory is given, use it. Otherwise, use the current working
 * directory.
 *
 * @param startDir Optional starting directory for the search. If not given, the current directory is used.
 * @returns Path to `package.json`, or `undefined` if not found.
 */
export function findPackageDir(
  startDir?: string,
  /** @internal */ fs = nodefs
): string | undefined {
  const manifest = findUp("package.json", { startDir }, fs);
  return manifest && path.dirname(manifest);
}

/**
 * Options which control how package dependecies are located.
 */
export type FindPackageDependencyOptions = {
  /**
   * Optional starting directory for the search. Defaults to `process.cwd()`.
   */
  startDir?: string;

  /**
   * Optional flag controlling whether symlinks can be found. Defaults to `true`.
   * When `false`, and the package dependency directory is a symlink, it will not
   * be found.
   */
  allowSymlinks?: boolean;

  /**
   * Optional flag controlling whether to resolve symlinks. Defaults to `false`.
   * Note that this flag has no effect if `allowSymlinks` is `false`.
   */
  resolveSymlinks?: boolean;
};

/**
 * Find the package dependency's directory, starting from the given directory
 * and moving outward, through all parent directories.
 *
 * Package dependencies exist under 'node_modules/[`scope`]/[`name`]'.
 *
 * @param ref Package dependency reference
 * @param options Options which control the search
 * @returns Path to the package dependency's directory, or `undefined` if not found.
 */
export function findPackageDependencyDir(
  ref: string | PackageRef,
  options?: FindPackageDependencyOptions,
  /** @internal */ fs = nodefs
): string | undefined {
  const pkgName =
    typeof ref === "string" ? ref : path.join(ref.scope ?? "", ref.name);
  const packageDir = findUp(
    path.join("node_modules", pkgName),
    {
      startDir: options?.startDir,
      type: "directory",
      allowSymlinks: options?.allowSymlinks,
    },
    fs
  );
  if (!packageDir || !options?.resolveSymlinks) {
    return packageDir;
  }

  return fs.realpathSync(packageDir);
}

/**
 * Resolve the path to a dependency given a chain of dependencies leading up to
 * it.
 * @param chain Chain of dependencies leading up to the target dependency.
 * @param startDir Optional starting directory for the search. If not given, the current directory is used.
 * @returns Path to the final dependency's directory.
 */
export function resolveDependencyChain(
  chain: string[],
  startDir = process.cwd()
) {
  return chain.reduce((startDir, module) => {
    const p = require.resolve(`${module}/package.json`, { paths: [startDir] });
    return path.dirname(p);
  }, startDir);
}
