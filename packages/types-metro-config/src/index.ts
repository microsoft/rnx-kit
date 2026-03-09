import type { TransformerConfigT } from "metro-config";
import type {
  BabelTransformerOptions as BaseTransformerOptions,
  BabelTransformerArgs as BaseTransformerArgs,
} from "metro-babel-transformer";
import type { BabelFileResult } from "@babel/core";

export type Environment = "production" | "development";

export type { TransformerConfigT } from "metro-config";
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
  applyAfterUser?: boolean;
};

/**
 * Types for babel transformers that can be set as the babelTransformerPath in the Metro transformer config.
 */

/**
 * Options passed in to the transform function of a babel transformer.
 */
export type BabelTransformerOptions<T extends object = object> = Omit<
  BaseTransformerOptions,
  "customTransformOptions"
> & {
  customTransformOptions: T & {
    rnxTransformer: {
      /** path to the upstream transformer, set here after being parsed from the root transformer config */
      babelTransformerPath: string;
    };
    /** Additional custom transform options */
    [key: string]: unknown;
  };
};

/**
 * Arguments passed in to the transform function of a babel transformer.
 */
export type BabelTransformerArgs<T extends object = object> = Omit<
  BaseTransformerArgs,
  "options"
> & {
  options: BabelTransformerOptions<T>;
};

/**
 * Transform function signature
 */
export type BabelTransform<T extends object = object> = (
  args: BabelTransformerArgs<T>,
) => Promise<BabelFileResult> | BabelFileResult;

/**
 * Cache key function signature
 */
export type GetCacheKey = () => string;

/**
 * Signature for the two functions that should be implemented by a babel transformer that is used by Metro.
 */
export type MetroBabelTransformer<T extends object = object> = {
  /**
   * Transform function called to transform a file. The options passed in will include the customTransformOptions specified above.
   * These are serialized to the worker processes where the transformers are executing.
   */
  transform: BabelTransform<T>;

  /**
   * Cache key function. This is called often, which means that while it can change if state changes, it should be calculated as
   * infrequently as possible.
   */
  getCacheKey?: GetCacheKey;
};
