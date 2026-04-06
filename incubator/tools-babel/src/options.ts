import path from "node:path";
import { getBabelConfig } from "./config";
import { getTrace } from "./tracing";
import type {
  TransformerSettings,
  TransformerContext,
  TransformerArgs,
  BabelTransformerArgs,
  SrcSyntax,
} from "./types";

function getBaseExt(ext: string, fallback?: SrcSyntax): SrcSyntax | undefined {
  switch (ext) {
    case ".ts":
      return "ts";
    case ".tsx":
      return "tsx";
    case ".js":
    case ".cjs":
    case ".mjs":
      return "js";
    case ".jsx":
    case ".cjsx":
    case ".mjsx":
      return "jsx";
    default:
      return fallback;
  }
}

/**
 * Initialize the context object, filling in the file specific information along with the
 * transformer settings.
 * @param filename the file being transformed, used to determine the extension and other file specific information
 * @param settings common settings for the transformer
 * @returns The initialized transformer context or undefined if the file should be skipped.
 */
export function initTransformerContext<
  T extends TransformerContext = TransformerContext,
>(filename: string, settings: Partial<TransformerSettings>): T | undefined {
  const {
    parseFlowDefault = true,
    parseExtAliases,
    parseExtDefault = "js",
  } = settings;
  const trace = getTrace(settings);

  const ext = path.extname(filename).toLowerCase();
  const srcSyntax: SrcSyntax | undefined =
    parseExtAliases?.[ext] ?? getBaseExt(ext, parseExtDefault);

  // invalid extension and no default means this file should be skipped, return undefined to indicate that
  if (!srcSyntax) {
    return undefined;
  }

  return {
    ...settings,
    trace,
    ext,
    srcSyntax,
    mayContainFlow:
      srcSyntax === "js" || srcSyntax === "jsx" ? parseFlowDefault : false,
    isNodeModule: filename.includes("node_modules"),
  } as T;
}

/**
 * This forms the TransformerArgs type, which does the following:
 * - Initialize the context with file specific information and common settings
 * - Optionally call the updateContext function allowing the caller to add additional configuration
 * - Get the babel config for this file, returning null if the file should be skipped
 * @param babelArgs the metro transformer args
 * @param settings additional configuration options to mix in
 * @param updateContext a function that allows additional configuration to be added to the context
 * @returns the transformer arguments or null if babel can't be loaded for the file
 */
export function makeTransformerArgs<
  T extends TransformerContext = TransformerContext,
>(
  babelArgs: BabelTransformerArgs,
  settings?: Partial<TransformerSettings>,
  updateContext?: (context: T, args: BabelTransformerArgs) => void
): TransformerArgs<T> | null {
  const { filename, src, options } = babelArgs;
  const context = initTransformerContext<T>(filename, {
    ...settings,
    trace: getTrace(settings),
  });
  if (context) {
    if (updateContext) {
      updateContext(context, babelArgs);
    }
    const config = getBabelConfig(babelArgs, context);
    if (config) {
      return { filename, src, options, context, config };
    }
  }
  return null;
}
