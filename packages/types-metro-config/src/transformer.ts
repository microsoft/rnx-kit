import type { TransformerConfigT } from "metro-config";
export type { TransformerConfigT } from "metro-config";

/**
 * Extended transformer config that includes additional options for configuring various options
 */
export type ExtendedTransformerConfig = Partial<TransformerConfigT> & {
  /**
   * Babel transformers to apply to types of files that match the specified glob patterns. The key is a glob
   * pattern that matches files to apply the transformer to, and the value is the path to a babel transformer.
   * - These patterns will use micromatch for matching and will be tested against the full filename, so a pattern of
   *   *.svg will likely fail due to the attached path meaning the ** pattern is likely needed.
   * - Note these use file paths just like babelTransformerPath as they will be serialized and sent to worker
   *   processes where they will be required via paths in that process.
   */
  babelTransformers?: Record<string, string>;

  /**
   * Many babel transformers, like the svg transformer, will do some work then send the result to either
   * @react-native/metro-babel-transformer. Setting this will attempt to force the transformer to use the specified
   * path instead.
   */
  upstreamBabelOverridePath?: string;

  /**
   * A convenience helper to add custom options to the babel transformers. These will be aggregated and set
   * in the getTransformerOptions return value to be passed to the babel transformers.
   */
  customTransformerOptions?: Record<string, unknown>;
};

/**
 * Options this package will set up as part of the customTransformOptions passed to the babel transformers.
 */
export type CustomTransformerOptions = {
  /**
   * What babel transformer to use as the final upstream transformer. By default will be the resolved path to
   * @react-native/metro-babel-transformer, but if overridden this will reflect that overridden path.
   */
  upstreamTransformerPath: string;

  /**
   * Resolutions to reroute to the upstream transformer.
   */
  upstreamTransformerAliases?: string[];

  /**
   * Conditional babel transformers from the transformer config
   */
  babelTransformers?: Record<string, string>;

  /**
   * Index signature for any unknown custom options
   */
  [key: string]: unknown;
};

/**
 * A transformer plugin will allow
 */
export type TransformerPlugin = {
  /**
   * transformer configuration settings to merge in with user settings and other plugin settings.
   */
  transformer?: ExtendedTransformerConfig;

  /**
   * By default, user settings will overwrite plugin settings. When this is set plugins will be applied
   * after the user settings, allowing them to take precedence.
   */
  highPrecedence?: boolean;
};
