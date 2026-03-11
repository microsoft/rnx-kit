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
 * Try to resolve the module path from here, falling back to resolving from the working directory if that fails.
 */
export function resolveModulePath(moduleName: string): string {
  try {
    return require.resolve(moduleName);
  } catch (_) {
    return require.resolve(moduleName, { paths: [process.cwd()] });
  }
}
