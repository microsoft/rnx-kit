import type { ExtendedTransformerConfig } from "@rnx-kit/types-metro-config";
import type { TransformerConfigT } from "metro-config";
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

function tryRequireResolve(
  moduleName: string,
  cwd?: string
): string | undefined {
  try {
    return require.resolve(moduleName, cwd ? { paths: [cwd] } : undefined);
  } catch {
    return undefined;
  }
}

export function getDefaultTransformerPath(): string {
  const baseTransformer = "@react-native/metro-babel-transformer";
  // try to resolve from the package root
  let transformerPath = tryRequireResolve(baseTransformer, process.cwd());
  if (!transformerPath) {
    // next try to get metro-config from the package root and resolve from there
    const metroConfigPath = tryRequireResolve(
      `@react-native/metro-config/package.json`,
      process.cwd()
    );
    if (metroConfigPath) {
      transformerPath = tryRequireResolve(
        baseTransformer,
        path.dirname(metroConfigPath)
      );
    }
  }
  if (!transformerPath) {
    throw new Error(
      `Unable to resolve the default transformer '${baseTransformer}'. Please ensure it is installed in your project.`
    );
  }
  return transformerPath;
}

/**
 * Determine if the given configuration is a base transformer config.
 * @param config configuration which may be a base config or an extended config
 * @returns true if the config is a base transformer config, false otherwise
 */
export function isBaseConfig(
  config: ExtendedTransformerConfig | Partial<TransformerConfigT>
): config is Partial<TransformerConfigT> {
  const asExtended = config as ExtendedTransformerConfig;
  return !asExtended.babelTransformers && !asExtended.customTransformerOptions;
}
