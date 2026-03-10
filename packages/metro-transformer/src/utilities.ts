import path from "node:path";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Simple merge helper that recursively merges plain objects but does not attempt to merge arrays or other types.
 */
export function simpleObjectMerge(
  ...options: Record<string, unknown>[]
): Record<string, unknown> {
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
 * Given a base module and an array of transformer paths
 * @param baseModule the upstream babel transformer that we want to remap to a different resolution
 * @param additionalTransformers a record where the values point to additional transformers that will also need to have baseModule remapped
 */
export function getModuleRedirectPaths(
  baseModule: string,
  additionalTransformers?: Record<string, string>
): string[] {
  const paths = [baseModule];
  const resolvedBase = require.resolve(baseModule);
  if (resolvedBase !== baseModule) {
    paths.push(resolvedBase);
  }

  if (additionalTransformers) {
    const foundTransformers = new Set<string>();
    for (const transformerPath of Object.values(additionalTransformers)) {
      foundTransformers.add(transformerPath);
    }
    for (const transformerPath of foundTransformers) {
      const resolvedTransformer = require.resolve(transformerPath);
      // now require.resolve the baseModule from the directory of the transformer and add it to the paths if it's different than the resolved base
      const resolvedFromTransformer = require.resolve(baseModule, {
        paths: [path.dirname(resolvedTransformer)],
      });
      if (resolvedFromTransformer !== resolvedBase) {
        paths.push(resolvedFromTransformer);
      }
    }
  }

  return paths;
}
