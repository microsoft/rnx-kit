import type { PackageManifest } from "@rnx-kit/types-node";

/**
 * Basic information about a package
 */
export type PackageContext<
  TManifest extends PackageManifest = PackageManifest,
> = {
  /** name of the package */
  readonly name: string;

  /** fully resolved root path of the package */
  readonly root: string;

  /** loaded package manifest, templated to allow type injection */
  readonly manifest: TManifest;

  /**
   * data storage by symbol value is allowed to have package specific values stored here. This allows
   * other packages to attach custom data to a package context in a way that is guaranteed to be unique
   * and not collide with any other properties on the package context.
   */
  [key: symbol]: unknown;
};

/**
 * A path to a value in a JSON file. A single string will be split on dots to create the path,
 * but an array of strings can also be used to avoid ambiguity with dots in property names. When using an array,
 * each segment will be treated as-is.
 *
 * Examples:
 * - "dependencies.react" is equivalent to ["dependencies", "react"]
 * - ["exports", ".", "import"] is ambiguous if using a string, but unambiguous as an array
 */
export type JSONValuePath = string | string[];

/** JSON primitive types */
export type JSONPrimitive = string | number | boolean | null;
/** JSON value type */
export type JSONValue = JSONPrimitive | Record<string, unknown> | JSONValue[];

/** Results of JSON validation */
export type JSONValidationResult = {
  /** whether the JSON file was modified to fix issues */
  changes: boolean;

  /** whether any unfixed errors were found during validation */
  errors: boolean;
};

/**
 * A editor and validator for a JSON object. This type provides methods to enforce values and can be run in fix mode
 * where edits will apply, or in non-fix mode where errors will be reported but no changes will be made.
 */
export type JSONValidator = {
  /**
   * Enforce a value in the JSON file. This will either report an error in not in fix mode, or update the
   * manifest if in fix mode. If the value is undefined, the property will be removed from the manifest as undefined
   * is not a valid JSON value and cannot be written to the manifest.
   *
   * Note that this signature is such that this can run against either a normal package context or the workspace
   * provided by yarn constraints.
   *
   * @param path manifest value to target
   * @param value either the value type to enforce, or undefined if the value should be removed
   */
  enforce(path: JSONValuePath, value: JSONValue | undefined): void;

  /**
   * Report an error related to JSON validation. This will log an error message and cause the validation result
   * to be "error", even in fix mode.
   */
  error(message: string): void;

  /**
   * Report that an edit was made to the JSON object. This will mark the validation as having changes
   * so that if running in fix mode the JSON file will be written with the changes applied when finish()
   * is called.
   */
  changed(): void;

  /**
   * Finish the validation run and return the result of the JSON validation. If in fix mode and changes were made,
   * the file will be written with the changes applied before returning the result.
   */
  finish(): JSONValidationResult;
};

/**
 * Combined context for validating a package.json file, including both the package information and the validation utilities.
 * This provides a wrapper around the manifest and will be able to edit the manifest when running in fix mode.
 */
export type PackageValidationContext<
  TManifest extends PackageManifest = PackageManifest,
> = PackageContext<TManifest> & JSONValidator;

/**
 * PackageInfo objects are cached instances of PackageContext that may include additional metadata
 * such as whether the package is part of a workspace. These objects are intended to be reused
 * across multiple operations to avoid repeatedly reading and parsing the same package.json files.
 */
export type PackageInfo = PackageContext & {
  /** Is this a workspace package */
  workspace?: boolean;
};

/**
 * Typed accessors for retrieving values from the package info
 */
export type GetPackageValue<T> = (pkgInfo: PackageInfo) => T;

/**
 * Set of accessor functions that can be retrieved for a specific symbol
 */
export type PackageValueAccessors<T> = {
  get: GetPackageValue<T>;
  has: (pkgInfo: PackageInfo) => boolean;
  set: (pkgInfo: PackageInfo, value: T) => void;
};
