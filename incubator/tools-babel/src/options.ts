import path from "node:path";
import { getTrace } from "./tracing";
import type { TransformerSettings, TransformerContext } from "./types";

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
