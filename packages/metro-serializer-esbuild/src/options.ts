import type {
  SerializerEsbuildConfig,
  TransformerBuildOptions,
} from "@rnx-kit/types-metro-serializer-esbuild";
import type { BuildOptions } from "esbuild";
import type { TransformerConfigT } from "metro-config";

export function getSupported(
  target: string | string[]
): BuildOptions["supported"] {
  const targets = Array.isArray(target) ? target : [target];
  if (!targets.some((t) => t.startsWith("hermes"))) {
    return undefined;
  }
  return {
    // test adding this one
    // "const-and-let": true,
    arrow: true,
    "default-argument": true,
    destructuring: true,
    generator: true,
    "rest-argument": true,
    "template-literal": true,
  };
}

export function getDefine({ dev }: { dev: boolean }): BuildOptions["define"] {
  return {
    __DEV__: JSON.stringify(Boolean(dev)),
    __METRO_GLOBAL_PREFIX__: "''",
    global: "global",
  };
}

export type EsbuildTransformOptions = TransformerBuildOptions & {
  /**
   * Remember the upstream transformer if set
   */
  babelTransformerPath?: TransformerConfigT["babelTransformerPath"];
};

const transformerOptionKeys: (keyof TransformerBuildOptions)[] = [
  "jsx",
  "jsxDev",
  "jsxFactory",
  "jsxFragment",
  "jsxImportSource",
  "logLevel",
  "target",
] as const;

export const CUSTOM_OPTIONS_KEY = "esbuildTransformer";

export function createEsbuildTransformOptions(
  config: SerializerEsbuildConfig,
  transformOptions: Partial<TransformerConfigT> = {}
): EsbuildTransformOptions | undefined {
  if (!config.transformWithEsbuild) {
    return undefined;
  }
  const customOptions = extractObjectValues(
    config,
    transformerOptionKeys
  ) as EsbuildTransformOptions;
  if (transformOptions.babelTransformerPath) {
    customOptions.babelTransformerPath = transformOptions.babelTransformerPath;
  }
  return customOptions;
}

export function getEsbuildTransformOptions(
  customTransformOptions?: Record<string, unknown>
): EsbuildTransformOptions {
  const raw = customTransformOptions?.[CUSTOM_OPTIONS_KEY];
  if (typeof raw === "object" && raw !== null) {
    return raw as EsbuildTransformOptions;
  }
  return {};
}

function extractObjectValues<T extends object>(
  config: T,
  keyList: (keyof T)[],
  excludeInstead?: boolean
): Partial<T> {
  const options: Partial<T> = {};
  for (const key in config) {
    const inKeyList = keyList.includes(key);
    const shouldInclude = excludeInstead ? !inKeyList : inKeyList;
    if (shouldInclude && config[key] !== undefined) {
      options[key] = config[key];
    }
  }
  return options;
}
