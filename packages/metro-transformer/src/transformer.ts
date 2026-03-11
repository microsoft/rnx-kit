import type {
  ExtendedTransformerConfig,
  TransformerConfigT,
  CustomTransformerOptions,
} from "@rnx-kit/types-metro-config";
import { resolveModulePath, simpleObjectMerge } from "./utilities";

type GetOptions = TransformerConfigT["getTransformOptions"];
const defaultTransformer = "@react-native/metro-babel-transformer";

export function MetroTransformer(
  ...configs: ExtendedTransformerConfig[]
): Partial<TransformerConfigT> {
  const result: Partial<TransformerConfigT> = {};
  const customOptions = {} as CustomTransformerOptions;
  const conditionalTransformers: Record<string, string> = {};
  const optionFunctions: GetOptions[] = [];

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
    customOptions.babelTransformers = conditionalTransformers;
  }

  // ensure the upstream transformer is available to the babel transformers
  customOptions.upstreamTransformerPath ??=
    result.babelTransformerPath ?? resolveModulePath(defaultTransformer);

  // create the merged getTransformOptions function
  result.getTransformOptions = createGetTransformOptions(
    optionFunctions,
    customOptions
  );

  // if we are doing custom work that requires the custom babel transformer, make sure to set it as the transformer to use
  if (customOptions.babelTransformers) {
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
  customTransformerOptions: CustomTransformerOptions
): GetOptions {
  return async (
    entryPoints: Parameters<GetOptions>[0],
    options: Parameters<GetOptions>[1],
    getDependenciesOf: Parameters<GetOptions>[2]
  ) => {
    const results =
      optionFunctions.length > 0
        ? await Promise.all(
            optionFunctions.map((func) =>
              func(entryPoints, options, getDependenciesOf)
            )
          )
        : [];
    return simpleObjectMerge(...results, { customTransformerOptions });
  };
}
