import fs from "node:fs";
import { styleText } from "node:util";
import type {
  JSONValue,
  JSONValidator,
  JSONValidationResult,
} from "./types.ts";

export type JSONValidatorOptions = {
  /** whether to apply fixes automatically when enforcing values */
  fix?: boolean;

  /**
   * path to the JSON file being validated.
   * - if provided - the validator will write the JSON file to disk if changed
   * - if not provided - the caller is responsible for writing the file if changes are made
   */
  jsonFilePath?: string;

  /**
   * error reporting callback. If not provided errors will be sent to console.error.
   */
  reportError?: (message: string) => void;

  /**
   * report prefix. If provided this string will be prepended to all error messages
   * reported via the `reportError` callback or to console.error.
   */
  reportPrefix?: string;
};

/**
 * Internal type for the editing context used by the various validation helper functions
 */
type JSONEditingContext = Pick<
  JSONValidator,
  "error" | "changed" | "finish"
> & {
  json: Record<string, JSONValue>;
  fix: boolean;
};

/**
 * Creates a JSON editing context for a given JSON object and validator options.
 * The returned context provides methods for reporting errors, tracking changes,
 * and finalizing the validation process, as well as access to the JSON object
 * and the `fix` flag indicating whether automatic fixes should be applied.
 * @param json the JSON object to be edited
 * @param options the JSON validator options controlling fix behavior and error reporting
 * @returns a JSONEditingContext instance for use by JSON validation helpers
 */
function createJSONEditingContext(
  json: Record<string, JSONValue>,
  options: JSONValidatorOptions
): JSONEditingContext {
  const { fix = false, reportError = console.error, reportPrefix } = options;
  let changes = false;
  let errors = false;

  // returned (and internally used) error reporting function
  function error(message: string) {
    errors = true;
    if (reportPrefix) {
      message = `${reportPrefix}${message}`;
    }
    reportError(message);
  }
  function changed() {
    changes = true;
  }
  function finish(): JSONValidationResult {
    return { changes, errors };
  }

  return { json, fix, error, changed, finish };
}

/**
 * Creates a JSON validator for a given JSON object and options. The returned validator
 * provides methods to enforce values at specific paths, report errors, track changes,
 * and finalize the validation process, optionally writing changes back to disk if fixes
 * are enabled and a file path is provided.
 * @param json loaded JSON object to validate and potentially modify
 * @param options options controlling fix behavior, error reporting, and file writing
 * @param baseObj optional object to assign the validator methods to, allowing the validator to be mixed into another context object if desired
 * @returns a JSONValidator instance for validating and optionally fixing the provided JSON object
 */
export function createJSONValidator<T extends object = object>(
  json: Record<string, JSONValue>,
  options: JSONValidatorOptions = {},
  baseObj?: T
): JSONValidator & T {
  // create the editing context used for helpers and change tracking
  const context = createJSONEditingContext(json, options);
  const { error, changed, finish: finishResult } = context;

  // enforce a value at a given path in the JSON object
  function enforce(path: string[], value: JSONValue | undefined) {
    if (value === undefined) {
      unsetValue(path, context);
    } else {
      setValue(path, value, context);
    }
  }

  // write the JSON file if needed and report the results
  function finish(): JSONValidationResult {
    const result = finishResult();
    if (result.changes && options.fix && options.jsonFilePath) {
      fs.writeFileSync(
        options.jsonFilePath,
        JSON.stringify(json, null, 2) + "\n",
        "utf-8"
      );
    }
    return result;
  }

  const validator: JSONValidator = { enforce, error, changed, finish };
  return baseObj
    ? Object.assign(baseObj, validator)
    : (validator as JSONValidator & T);
}

/**
 * Function to assert that a given object conforms to the JSONValidator interface
 * @param obj the object to check
 * @returns true if the object implements all required methods of JSONValidator, false otherwise
 */
export const isJSONValidator = (() => {
  const requiredPropTypes: Record<keyof JSONValidator, string> = {
    enforce: "function",
    error: "function",
    changed: "function",
    finish: "function",
  };
  return (obj: unknown): obj is JSONValidator => {
    if (isRecord(obj)) {
      for (const key of Object.keys(requiredPropTypes)) {
        if (
          !(key in obj) ||
          typeof obj[key] !== requiredPropTypes[key as keyof JSONValidator]
        ) {
          return false;
        }
      }
      return true;
    }
    return false;
  };
})();

/**
 * Removes a value at a given path in the JSON object. If the value exists at the specified path,
 * it will either be deleted (if `context.fix` is true) or reported as an error.
 * @param path the path to the value to remove, as an array of keys representing the path in the JSON object
 * @param context the editing context used for error reporting and change tracking
 */
function unsetValue(path: string[], context: JSONEditingContext) {
  if (path.length > 0) {
    const parent = walkPath(path, context, false);
    if (parent) {
      const valueKey = path[path.length - 1];
      if (valueKey in parent) {
        context.changed();
        if (context.fix) {
          delete parent[valueKey];
        } else {
          context.error(valueMessage(path, undefined, parent[valueKey]));
        }
      }
    }
  }
}

/**
 * Sets a value at a given path in the JSON object, creating intermediate objects as needed.
 * If the current value at the path differs from the desired value, the change will either be applied
 * (if `context.fix` is true) or reported as an error.
 * @param path the to the value to set, as an array of keys representing the path in the JSON object
 * @param value the value to set at the specified path
 * @param context the editing context used for error reporting and change tracking
 */
function setValue(
  path: string[],
  value: JSONValue,
  context: JSONEditingContext
) {
  const parent = walkPath(path, context, true);
  if (!parent) {
    context.error(valueMessage(path, value, undefined));
  } else {
    const currentValue = parent[path[path.length - 1]];
    if (!compareValues(currentValue, value)) {
      if (context.fix) {
        context.changed();
        parent[path[path.length - 1]] = value;
      } else {
        context.error(valueMessage(path, value, currentValue));
      }
    }
  }
}

/**
 * Walks a path through a JSON object returning the parent object of the last key in the path.
 * If `ensureExists` is true, missing intermediate objects will be created along the path, potentially overwriting
 * existing non-object values.
 * @param path path to walk through the JSON object, as an array of keys
 * @param context editing context used for error reporting and change tracking
 * @param ensureExists if true, missing intermediate objects along the path will be created
 * @returns the parent object of the last key in the path, or undefined if the path cannot be walked
 */
function walkPath(
  path: string[],
  context: JSONEditingContext,
  ensureExists: boolean
): Record<string, unknown> | undefined {
  let current: Record<string, unknown> = context.json;
  // walk to the second to last segment, the last one is the key we want to set/unset
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    if (!isRecord(current[segment])) {
      if (ensureExists) {
        context.changed();
        current[segment] = {};
      } else {
        return undefined;
      }
    } else {
      current = current[segment];
    }
  }
  return current;
}

/** plain object type assertion checker */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Does a deep equality check of two values. Will check objects and arrays recursively. Objects are
 * treated as ordered structures as they are written to JSON in a specific order and a mismatch indicates
 * a change is needed.
 * @param value1 The first value to compare.
 * @param value2 The second value to compare.
 * @returns True if the values are equal, false otherwise.
 */
export function compareValues(value1: unknown, value2: unknown): boolean {
  // short-circuit for primitive equality and identical object references
  if (value1 === value2) {
    return true;
  }

  // only non-null objects need to have special handling, otherwise fall through to false below
  if (
    typeof value1 === "object" &&
    typeof value2 === "object" &&
    value1 !== null &&
    value2 !== null
  ) {
    // handle the both objects are arrays case, in this case walk through them and compare each value deeply
    if (Array.isArray(value1) && Array.isArray(value2)) {
      if (value1.length !== value2.length) {
        return false;
      }
      for (let i = 0; i < value1.length; i++) {
        if (!compareValues(value1[i], value2[i])) {
          return false;
        }
      }
      return true;
    }

    // handle the both plain objects case, checking keys including key ordering and comparing values deeply
    if (isRecord(value1) && isRecord(value2)) {
      const keys = Object.keys(value1);
      // compare the two key arrays for equality including order
      if (!compareValues(keys, Object.keys(value2))) {
        return false;
      }

      // now compare the values for each key recursively
      for (const key of keys) {
        if (!compareValues(value1[key], value2[key])) {
          return false;
        }
      }
      return true;
    }
  }
  // already did the === check at the top of the function
  return false;
}

/**
 * Formats a value for display in error messages, highlighting undefined values in red
 * and other values in green.
 */
function formatValue(value: unknown): string {
  if (value === undefined) {
    return styleText("red", "UNSET");
  }
  if (typeof value === "object" && value !== null) {
    return styleText("green", JSON.stringify(value));
  }
  return styleText("green", String(value));
}

/**
 * Format a validation message showing the expected and current values for a given JSON path.
 */
function valueMessage(
  path: string[],
  expected: unknown,
  current: unknown
): string {
  return `${styleText("cyan", path.join("."))} should be: ${formatValue(expected)} [current: ${formatValue(current)}]`;
}
