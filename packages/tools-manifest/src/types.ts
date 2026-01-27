/**
 * A group of exports
 */
export type ExportsGroup = {
  types?: string;
  import?: string;
  require?: string;
  default?: string;
} & Record<string, string | Record<string, string>>;

export type PackageExports = Record<string, string | ExportsGroup>;

export type PersonEntry = {
  name: string;
  email?: string;
  url?: string;
};

export type PackagePerson = string | PersonEntry;

export type FundingEntry = string | { type: string; url: string };

/**
 * Type definitions for package.json manifest files.
 */
export type PackageManifest<T extends Record<string, unknown> = {}> = {
  // ----- Identity and metadata -----

  /** package name, including scope */
  name: string;
  /** package version */
  version: string;

  /** whether the package is private */
  private?: boolean;
  /** short description to help with npm search and discovery */
  description?: string;
  /** keywords to aid npm search requests */
  keywords?: string[];
  /** SPDX license identifier or "UNLICENSED" */
  license?: string;

  /** primary author of this package */
  author?: PackagePerson;
  /** array of contributors */
  contributors?: PackagePerson[];
  /** one or more places to send funding */
  funding?: FundingEntry | FundingEntry[];
  /** homepage */
  homepage?: string;

  /** repository information for this package, directory is specified when package is not at root */
  repository?: string | { type: string; url: string; directory?: string };
  /** issue tracking information for this package */
  bugs?: { url?: string; email?: string } | string;

  // ----- Package type and entry points -----

  /** generally set to "module" for ES modules, omitted for CJS */
  type?: string;
  /** main or CJS entry point */
  main?: string;
  /** ESM entry point */
  module?: string;
  /** Browser entry point */
  browser?: string;
  /** TypeScript declaration entry point */
  types?: string;
  /** @deprecated Use `types` instead */
  typings?: string;
  /** exports map */
  exports?: PackageExports;

  // files, side effects, and bin
  files?: string[];
  sideEffects?: boolean | string[];
  bin?: string | Record<string, string>;

  /** package lifecycle scripts */
  scripts?: Record<string, string>;

  // ----- dependencies -----

  /** runtime dependencies */
  dependencies?: Record<string, string>;
  /** peer dependencies */
  peerDependencies?: Record<string, string>;
  /** metadata for peer dependencies */
  peerDependenciesMeta?: Record<string, { optional: boolean }>;
  /** development dependencies */
  devDependencies?: Record<string, string>;
  /** optional runtime dependencies, install will pass even if not found */
  optionalDependencies?: Record<string, string>;
  /** bundle dependencies, list of dependencies to be bundled */
  bundledDependencies?: string[];

  // ----- Environment and Package Management -----

  /** package manager used to create/install this package */
  packageManager?: string;
  /** engines required to run this package */
  engines?: Record<string, string>;
  /** allow|reject list of OSes, use ! syntax for rejection */
  os?: string[];
  /** allow|reject list of CPUs, use ! syntax for rejection */
  cpu?: string[];

  /** workspace configuration for monorepos */
  workspaces?: string[] | { packages: string[] };
  /** dependency version overrides via resolutions */
  resolutions?: Record<string, string>;

  /** configuration for publishing */
  publishConfig?: Record<string, unknown>;
} & T;

/**
 * Data structure representing a package's location and manifest.
 */
export type PackageData<T extends PackageManifest = PackageManifest> = {
  /** full path to the package.json file */
  root: string;
  /** parsed package manifest */
  manifest: T;
};
