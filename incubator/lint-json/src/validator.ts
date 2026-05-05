import { readJSONFileSync, writeJSONFileSync } from "@rnx-kit/tools-filesystem";
import { formatAsTree } from "@rnx-kit/tools-formatting";
import path from "node:path";
import { compareValues } from "./compare.ts";
import type {
  JSONValue,
  JSONValidator,
  JSONValuePath,
  JSONValidatorOptions,
  JSONObject,
} from "./types.ts";
import {
  formatHeader,
  getJSONPathSegments,
  isRecord,
  valueMessage,
} from "./utilities.ts";

/**
 * Internal partial type to pass to helper functions that enforce or unset values
 */
type JSONEditingContext = Omit<JSONValidator, "enforce" | "finish">;

/**
 * Creates a JSON validator for a given JSON object and options. The returned validator
 * provides methods to enforce values at specific paths, report errors, track changes,
 * and finalize the validation process, optionally writing changes back to disk if fixes
 * are enabled and a file path is provided.
 * @param jsonPath the path to the JSON file being validated; used for default error headers and writing on fix
 * @param json loaded JSON object to validate; if not provided the file at `jsonPath` will be read from disk
 * @param userOptions options controlling fix behavior, error reporting, and file writing
 * @returns a JSONValidator instance for validating and optionally fixing the provided JSON object
 */
export function createJSONValidator(
  jsonPath: string,
  json: Record<string, JSONValue> | undefined,
  options: JSONValidatorOptions = {}
): JSONValidator {
  // work from a resolved path so that relative paths in error messages are consistent
  jsonPath = path.resolve(jsonPath);

  // track whether any changes have been made to the JSON object and errors encountered
  let changes = false;
  const errors: string[] = [];

  // create the editing context that will be passed to helper functions for enforcing values
  const context: JSONEditingContext = {
    fix: options.fix ?? false,
    raw: json ?? readJSONFileSync(jsonPath),
    dirty: () => {
      changes = true;
    },
    error: (message: string) => {
      errors.push(message);
    },
  };

  function finish(): number {
    // if changes were made and fixes are enabled, write the updated JSON back to disk
    if (changes && context.fix) {
      writeJSONFileSync(jsonPath, context.raw);
      changes = false;
    }
    // if any errors were encountered, format and report them
    if (errors.length > 0) {
      const header = options.header ?? formatHeader(jsonPath);
      const report = options.reportError ?? console.error;

      // add the footer message if one was provided
      if (options.footer) {
        context.error(options.footer);
      }
      report(formatAsTree(header, errors));
      return 1;
    }
    // if no errors were encountered, return 0 to indicate success
    return 0;
  }

  // enforce a value at a given path in the JSON object
  function enforce(path: JSONValuePath, value: JSONValue | undefined) {
    const pathArray = getJSONPathSegments(path);
    if (value === undefined) {
      unsetValue(pathArray, context);
    } else {
      setValue(pathArray, value, context);
    }
  }

  // add the two main methods to the context so that the returned validator has enforce and finish
  return Object.assign(context, { enforce, finish });
}

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
        if (context.fix) {
          context.dirty();
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
        context.dirty();
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
): JSONObject | undefined {
  let current = context.raw;
  // walk to the second to last segment, the last one is the key we want to set/unset
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    if (!isRecord(current[segment])) {
      if (ensureExists && context.fix) {
        context.dirty();
        current[segment] = {};
      } else {
        return undefined;
      }
    }
    current = current[segment];
  }
  return current;
}
