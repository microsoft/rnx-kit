import type {
  ExtendedTransformerConfig,
  TransformerConfigT,
  CustomTransformerOptions,
  TransformerPlugin,
} from "@rnx-kit/types-metro-config";
import { getModuleRedirectPaths, simpleObjectMerge } from "./utilities";

type GetOptions = TransformerConfigT["getTransformOptions"];
const defaultTransformer = "@react-native/metro-babel-transformer";

export function MetroTransformer(
  config: ExtendedTransformerConfig | ExtendedTransformerConfig[] = {},
  plugins: TransformerPlugin[] = [],
): Partial<TransformerConfigT> {
  const beforeConfigs: ExtendedTransformerConfig[] = plugins
    .filter((plugin) => plugin.transformer && !plugin.highPrecedence)
    .map((plugin) => plugin.transformer!);
  const userConfigs = Array.isArray(config) ? config : [config];
  const afterConfigs = plugins
    .filter((plugin) => plugin.transformer && plugin.highPrecedence)
    .map((plugin) => plugin.transformer!);
  return buildTransformerConfig(
    ...beforeConfigs,
    ...userConfigs,
    ...afterConfigs,
  );
}

export function buildTransformerConfig(
  ...configs: ExtendedTransformerConfig[]
): Partial<TransformerConfigT> {
  const result: Partial<TransformerConfigT> = {};
  const customOptions = {} as CustomTransformerOptions;
  const conditionalTransformers: Record<string, string> = {};
  const optionFunctions: GetOptions[] = [];
  let needsBabelTransformer = false;
  for (const config of configs) {
    const {
      customTransformerOptions = {},
      babelTransformers = {},
      upstreamBabelOverridePath,
      getTransformOptions,
      ...additionalConfig
    } = config;
    // merge in any transformers or custom options
    Object.assign(conditionalTransformers, babelTransformers);
    Object.assign(customOptions, customTransformerOptions);

    if (upstreamBabelOverridePath) {
      customOptions.upstreamTransformerPath = upstreamBabelOverridePath;
    }
    if (getTransformOptions) {
      optionFunctions.push(getTransformOptions);
    }
    // merge the result of the options into the final transformer config
    Object.assign(result, additionalConfig);
  }
  // remember any conditional transformers if they were set
  if (Object.keys(conditionalTransformers).length > 0) {
    needsBabelTransformer = true;
    customOptions.babelTransformers = conditionalTransformers;
  }
  if (customOptions.upstreamTransformerPath) {
    // if the user has specified an upstream transformer treat that as a request to override resolution
    // to that transformer
    customOptions.upstreamTransformerAliases = getModuleRedirectPaths(
      defaultTransformer,
      customOptions.babelTransformers,
    );
    needsBabelTransformer = true;
  } else {
    // otherwise just mark the default as the upstream transformer
    customOptions.upstreamTransformerPath =
      result.babelTransformerPath ?? require.resolve(defaultTransformer);
  }
  result.getTransformOptions = createGetTransformOptions(
    optionFunctions,
    customOptions,
  );
  // if we are doing custom work that requires the custom babel transformer, make sure to set it as the transformer to use
  if (needsBabelTransformer) {
    Object.assign(result, {
      babelTransformerPath: require.resolve("./babelTransformer"),
    });
  }

  return result;
}

/**
 * Create an aggregated getTransformOptions function that will call multiple provided functions,
 * then aggregate the results together.
 */
function createGetTransformOptions(
  optionFunctions: GetOptions[],
  customTransformerOptions: CustomTransformerOptions,
): GetOptions {
  return async (
    entryPoints: Parameters<GetOptions>[0],
    options: Parameters<GetOptions>[1],
    getDependenciesOf: Parameters<GetOptions>[2],
  ) => {
    const results =
      optionFunctions.length > 0
        ? await Promise.all(
            optionFunctions.map((func) =>
              func(entryPoints, options, getDependenciesOf),
            ),
          )
        : [];
    return simpleObjectMerge(...results, { customTransformerOptions });
  };
}
