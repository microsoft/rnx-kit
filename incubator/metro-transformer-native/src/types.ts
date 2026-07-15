import type { BabelFileResult } from "@babel/core";
import type {
  TransformerSettings,
  TransformerArgs as BaseTransformerArgs,
  TransformerContext as BaseTransformerContext,
} from "@rnx-kit/tools-babel";

export type TransformerNativeOptions = {
  /**
   * Whether native transformations are enabled. Top-level options to disable native transformations entirely.
   * @default true
   */
  nativeTransform?: boolean;

  /**
   * Do selective preprocessing of TS/TSX files with the native engine before handing off to babel
   * @default true
   */
  handleTs?: boolean;

  /**
   * 
   */

  /**
   * Do selective preprocessing of JS files with the native engine before handing off to babel
   */
  handleJs?: boolean;

  /**
   * Do JSX transformations with the native engine, will handle TSX only unless handleJs is also specified.
   */
  handleJsx?: boolean;

  /**
   * Natively handle module syntax transformations
   */
  handleModules?: boolean;

  /**
   * Handle SVG transformations using svgr core, will require the optional peer dependencies to be fulfilled
   * to work correctly.
   */
  handleSvg?: boolean;

  /**
   * Add an additional element to the cache key for the transformer. If this is a string it will be appended directly, if
   * set to true the current time will be used ensuring the cache is always invalidated. Boolean mode is for testing/perf measurement
   * purposes.
   */
  dynamicKey?: boolean | string;

  /**
   * Run the transformer in async mode
   */
  asyncTransform?: boolean;

  /**
   * Upstream delegates based on file extensions. This is a record of the format:
   * {
   *   [babelTransformerPath]: extension,   // match one extension
   *   [babelTransformerPath]: [extension1, extension2],  // match multiple extensions
   * }
   * Entries will be evaluated in order. Extensions should include the dot, to match what path.extname returns
   */
  upstreamDelegates?: Record<string, string | string[]>;
};

export type TransformerOptions = TransformerNativeOptions &
  Omit<TransformerSettings, "trace">;

export type TransformerContext = BaseTransformerContext &
  TransformerNativeOptions;

export type TransformerArgs = BaseTransformerArgs<TransformerContext>;

/**
 * Which native engine to use for source preprocessing
 */
export type NativeEngine = "esbuild" | "swc";

export type SrcType = "js" | "jsx" | "ts" | "tsx";

export type SourceTransformResult = {
  /**
   * The transformed source code, returned as a string
   */
  code: string;

  /**
   * Source map in string form, babel doesn't handle inline source maps
   */
  map?: string;
};

/**
 * Signature for a source transformer that runs before passing to an upstream transformer
 */
export type SourceTransformer = (
  args: TransformerArgs
) => SourceTransformResult | null | Promise<SourceTransformResult | null>;

/**
 * Signature for an upstream transformer, whose results will be returned to metro
 */
export type UpstreamTransformer = (
  args: TransformerArgs
) => BabelFileResult | Promise<BabelFileResult>;

export type TransformerModule = {
  transform: UpstreamTransformer;
};
