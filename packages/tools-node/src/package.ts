import { pickValues } from "@rnx-kit/tools-language/properties";
import findUp from "find-up";
import * as fs from "fs";
import * as path from "path";
import pkgDir from "pkg-dir";
import pkgUp from "pkg-up";

/**
 * Components of a package reference.
 */
export type PackageRef = {
  scope?: string;
  name: string;
};

/**
 * Parse a package reference string. An example reference is the `name`
 * property found in `package.json`.
 *
 * @param r Package reference string
 * @returns Parsed package reference object
 */
export function parsePackageRef(r: string): PackageRef {
  if (r.startsWith("@")) {
    // If `/` is not found, the reference could be a path alias.
    const indexSeparator = r.indexOf("/");
    if (indexSeparator >= 0) {
      // The separator must start from position >= 2 to ensure that it is '@'
      // and at least one other character. Further, the separator must have
      // at least 1 character following it, before the end of the string.
      if (indexSeparator < 2 || indexSeparator + 2 >= r.length) {
        throw new Error(`Invalid package reference: "${r}"`);
      }

      return {
        scope: r.substring(0, indexSeparator),
        name: r.substring(indexSeparator + 1),
      };
    }
  }

  if (!r) {
    throw new Error(`Invalid package reference: "${r}"`);
  }
  return { name: r };
}

/**
 * Get the mangled name for a package reference.
 *
 * @param ref Package reference
 * @returns Mangled name
 */
export function getMangledPackageName(ref: PackageRef): string {
  if (ref.scope) {
    return ref.scope.slice(1) + "__" + ref.name;
  }
  return ref.name;
}

/**
 * Schema for a reference to a person in `package.json`.
 */
export type PackagePerson =
  | string
  | {
      name: string;
      email?: string;
      url?: string;
    };

/**
 * Schema for the contents of a `package.json` manifest file.
 */
export type PackageManifest = {
  name: string;
  version: string;
  private?: boolean;
  typings?: string;
  types?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  author?: PackagePerson;
  "rnx-kit"?: Record<string, unknown>;
  [key: string]:
    | string
    | boolean
    | string[]
    | Record<string, unknown>
    | undefined;
};

/**
 * Determine if the given object is a `package.json` manifest.
 *
 * @param manifest Object to evaluate
 * @returns `true` if the object is a manifest
 */
export function isPackageManifest(
  manifest: unknown
): manifest is PackageManifest {
  return (
    typeof manifest === "object" &&
    manifest !== null &&
    "name" in manifest &&
    "version" in manifest
  );
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
export function readPackage(pkgPath: string): PackageManifest {
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
  space = "  "
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
export function findPackage(startDir?: string): string | undefined {
  return pkgUp.sync({ cwd: startDir ? startDir : process.cwd() }) ?? undefined;
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
export function findPackageDir(startDir?: string): string | undefined {
  return pkgDir.sync(startDir ? startDir : process.cwd()) ?? undefined;
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
  options?: FindPackageDependencyOptions
): string | undefined {
  const pkgName =
    typeof ref === "string" ? ref : path.join(ref.scope ?? "", ref.name);
  const packageDir = findUp.sync(path.join("node_modules", pkgName), {
    ...pickValues(
      options ?? {},
      ["startDir", "allowSymlinks"],
      ["cwd", "allowSymlinks"]
    ),
    type: "directory",
  });
  if (!packageDir || !options?.resolveSymlinks) {
    return packageDir;
  }

  return fs.lstatSync(packageDir).isSymbolicLink()
    ? path.resolve(path.dirname(packageDir), fs.readlinkSync(packageDir))
    : packageDir;
}
