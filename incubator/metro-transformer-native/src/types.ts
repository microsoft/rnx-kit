import type { BabelFileResult } from "@babel/core";
import type {
  TransformerSettings,
  TransformerArgs as BaseTransformerArgs,
  TransformerContext as BaseTransformerContext,
} from "@rnx-kit/tools-babel";

/**
 * Target ECMAScript version that the native engine downlevels TO. Syntax at
 * or below this level passes through untouched.
 *
 * - `"es2017"`: older JSC; downlevels ??, ?., private fields, ??=, ||=.
 * - `"es2020"`: modern V8 / iOS 14+ JSC; preserves ?? and ?.
 * - `"es2022"`: Hermes 0.13+, modern Android JSC, Web; preserves all above
 *   plus class private fields.
 *
 * @default "es2022"
 */
export type NativeTarget = "es2017" | "es2020" | "es2022";

export type TransformerNativeOptions = {
  /**
   * Whether native transformations are enabled. Top-level options to disable native transformations entirely.
   * @default true
   */
  nativeTransform?: boolean;

  /**
   * Target ECMAScript version that the native engine downlevels TO. Syntax at
   * or below this level passes through untouched. The string-union (not SWC's
   * full `JscTarget` enum) keeps the public surface stable.
   * @default "es2022"
   */
  target?: NativeTarget;

  /**
   * Do selective preprocessing of TS/TSX files with the native engine before handing off to babel
   * @default true
   */
  handleTs?: boolean;

  /**
   * Do selective preprocessing of JS files with the native engine before handing off to babel
   * @default false
   */
  handleJs?: boolean;

  /**
   * Do JSX transformations with the native engine, will handle TSX only unless handleJs is also specified.
   * @default false
   */
  handleJsx?: boolean;

  /**
   * Natively handle module syntax transformations
   * @default false
   */
  handleModules?: boolean;

  /**
   * Handle SVG transformations using svgr core, will require the optional peer dependencies to be fulfilled
   * to work correctly.
   * @default false
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
   * @default false
   */
  asyncTransform?: boolean;

  /**
   * Upstream delegates based on file extensions. Each entry pairs a transformer
   * module with one or more extensions; entries are evaluated head-to-tail and
   * the first matching extension wins. If no entry matches, the built-in
   * transformer runs.
   */
  upstreamDelegates?: UpstreamDelegate[];
};

/**
 * A single upstream delegate entry: a transformer module to route to and the
 * file extension(s) it should handle.
 */
export type UpstreamDelegate = {
  /**
   * Module specifier or path resolvable from the project root. Bare specifiers,
   * absolute paths, and relative paths (starting with `./` or `../`) are all
   * accepted.
   */
  transformerPath: string;

  /**
   * One or more file extensions this delegate handles. Each entry MUST start
   * with a dot (e.g. `.ts`, `.tsx`, `.svg`) and is matched case-insensitively
   * against `path.extname(filename).toLowerCase()`.
   */
  extensions: string | string[];
};

export type TransformerOptions = TransformerNativeOptions & TransformerSettings;

export type TransformerContext = BaseTransformerContext &
  TransformerNativeOptions;

export type TransformerArgs = BaseTransformerArgs<TransformerContext>;

/**
 * Which native engine to use for source preprocessing
 * @internal
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
