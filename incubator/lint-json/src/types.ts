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
export type JSONValue =
  | string
  | number
  | boolean
  | JSONArray
  | JSONObject
  | null;
export type JSONArray = JSONValue[];
export type JSONObject = { [key: string]: JSONValue };

/**
 * A editor and validator for a JSON object. This type provides methods to enforce values and can be run in fix mode
 * where edits will apply, or in non-fix mode where errors will be reported but no changes will be made.
 */
export type JSONValidator = {
  /**
   * Are we running in fix mode? If true, any changes made by the validator will be written
   * back to the JSON file when finish() is called. If false, changes will not be applied and only
   * errors will be reported.
   */
  readonly fix: boolean;

  /**
   * JSON object being edited by the validator. This is the object that will be written out
   * to the JSON file if fix mode is enabled and changes are made.
   */
  raw: JSONObject;

  /**
   * Enforce a value in the JSON file. This will either report an error in not in fix mode, or update the
   * manifest if in fix mode. If the value is undefined, the property will be removed from the manifest as undefined
   * is not a valid JSON value and cannot be written to the manifest.
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
   * Mark the JSON as dirty, indicating that changes have been made to the JSON object and that fixes should
   * be written back to the JSON file when finish() is called if fix mode is enabled.
   */
  dirty(): void;

  /**
   * Finish the validation run and return the result of the JSON validation. If in fix mode and changes were made,
   * the file will be written with the changes applied before returning the result.
   * @returns a process exit code indicating the result of the validation: 0 success, 1 = unhandled errors
   */
  finish(): number;
};

/**
 * Options type for creating a JSON validator. All properties are optional and will
 * be resolved to a fully specified ResolvedOptions object internally by the validator.
 */
export type JSONValidatorOptions = {
  /**
   * whether to apply fixes automatically when enforcing values
   */
  fix?: boolean;

  /**
   * error message header, to preface the tree-formatted error output. Will default to
   * "errors in: <relative path to JSON file>" if not provided.
   */
  header?: string;

  /**
   * error footer message to display at the end of validation output if errors were found.
   * Used for displaying messages like "re-run with --fix to automatically apply fixes"
   */
  footer?: string;

  /**
   * error reporting callback. If not provided output will be sent to console.error.
   */
  reportError?: (message: string) => void;
};
