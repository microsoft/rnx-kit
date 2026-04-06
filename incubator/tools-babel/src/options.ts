import path from "node:path";
import { getBabelConfig } from "./config";
import { getTrace } from "./tracing";
import type {
  TransformerSettings,
  TransformerContext,
  TransformerArgs,
  BabelTransformerArgs,
} from "./types";

function getBaseExt(ext: string, fallback?: string): string | undefined {
  switch (ext) {
    case ".ts":
      return ".ts";
    case ".tsx":
      return ".tsx";
    case ".js":
    case ".cjs":
    case ".mjs":
      return ".js";
    case ".jsx":
    case ".cjsx":
    case ".mjsx":
      return ".jsx";
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
    parseExtDefault = ".js",
  } = settings;
  const trace = getTrace(settings);

  const base = path.extname(filename).toLowerCase();
  const ext: string | undefined =
    parseExtAliases?.[base] ?? getBaseExt(base, parseExtDefault);

  // invalid extension and no default means this file should be skipped, return undefined to indicate that
  if (!ext) {
    return undefined;
  }

  return {
    ...settings,
    trace,
    ext,
    hasTs: Boolean(ext === ".ts" || ext === ".tsx"),
    hasJsx: Boolean(ext === ".jsx" || ext === ".tsx"),
    mayContainFlow: ext === ".js" || ext === ".jsx" ? parseFlowDefault : false,
    isNodeModule: filename.includes("node_modules"),
  } as T;
}

export function makeTransformerArgs<
  T extends TransformerContext = TransformerContext,
>(
  babelArgs: BabelTransformerArgs,
  settings?: Partial<TransformerSettings>,
  updateContext?: (context: T) => void
): TransformerArgs<T> | null {
  const { filename, src, options } = babelArgs;
  const context = initTransformerContext<T>(filename, {
    ...settings,
    trace: getTrace(settings),
  });
  if (context) {
    if (updateContext) {
      updateContext(context);
    }
    const config = getBabelConfig(babelArgs, context);
    if (config) {
      return { filename, src, options, context, config };
    }
  }
  return null;
}
