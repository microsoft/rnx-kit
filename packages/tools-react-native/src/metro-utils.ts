import type { GetTransformOptions, TransformerConfigT } from "metro-config";

/**
 * Type guard to check if a value is a plain object (i.e., a record). This is used to ensure that we only attempt to
 * recursively merge plain objects in the `simpleObjectMerge` function.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Simple merge helper that recursively merges plain objects. Note that array merges are not supported,
 * as the behavior isn't deterministic (e.g., should we concatenate arrays, or override them?). If a property is an array in
 * multiple configs, the value from the last config will win.
 */
function simpleObjectMerge(
  ...options: Record<string, unknown>[]
): Record<string, unknown> {
  /** @type {Record<string, unknown>} */
  const result: Record<string, unknown> = {};
  for (const option of options) {
    for (const [key, value] of Object.entries(option)) {
      if (isRecord(value) && isRecord(result[key])) {
        result[key] = simpleObjectMerge(result[key], value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Creates a function that sequentially calls multiple `GetTransformOptions` functions and merges their results.
 */
function createGetTransformOptions(
  ...subFunctions: GetTransformOptions[]
): GetTransformOptions {
  if (subFunctions.length === 0) {
    throw new Error("At least one getTransformOptions function is required");
  } else if (subFunctions.length === 1) {
    return subFunctions[0];
  } else {
    return async (entryPoints, options, getDepsOf) => {
      const results = await Promise.all(
        subFunctions.map((fn) => fn(entryPoints, options, getDepsOf))
      );
      return simpleObjectMerge(...results);
    };
  }
}

/**
 * Merges multiple Metro transformer configurations into one. Properties from later configs override earlier
 * ones. If multiple configs provide a `getTransformOptions` function, the returned config wraps them so that each
 * is called in order and their results are deep-merged.
 *
 * @param configs one or more transformer config objects to merge. Later configs take precedence over earlier ones.
 * @returns transformer configuration suitable for use by Metro
 */
export function mergeTransformerConfigs(
  ...configs: Partial<TransformerConfigT>[]
): Partial<TransformerConfigT> {
  // collect the getTransformOptions functions from all configs, and if there are multiple, we'll create a wrapper function for them
  const getTransformOptionsFns = configs
    .reduce<TransformerConfigT["getTransformOptions"][]>((result, config) => {
      const getTransformOptions = config?.getTransformOptions;
      if (typeof getTransformOptions === "function") {
          result.push(getTransformOptions);
      }
      return result;
    }, []);

  // if there are multiple getTransformOptions functions, create a wrapper function that calls in sequence and merges their results
  if (getTransformOptionsFns.length > 1) {
    configs.push({
      getTransformOptions: createGetTransformOptions(...getTransformOptionsFns),
    });
  }

  return Object.assign({}, ...configs);
}
